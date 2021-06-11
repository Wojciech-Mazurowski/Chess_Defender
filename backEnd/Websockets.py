import json

from flask import Flask, render_template, session, request, copy_current_request_context, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
import ChessDB_PT
import random
import hashlib
from flask_cors import CORS
import rating
from timeit import default_timer as timer
import ChessLogic




app = Flask(__name__)
app.config['SECRET_KEY'] = 'secretkey'
app.config['DEBUG'] = True
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/*": {"origins": "*"}})
debug_mode = True

frontend_url = 'http://localhost:3000'

# TODO Uncomment below when ssl is installed (secure cookies)
# app.config.update(
#     SESSION_COOKIE_HTTPONLY= True,
#     SESSION_COOKIE_SECURE=True,
# )

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_SAMESITE='None'
)

# User login sessions
# userid (string) is key, contains dict with 'session_token' and 'refresh_token'
# ex. tkn=Sessions['3']['refresh_token'] gets refresh token for playerId 3
Sessions = {}

# Matchmaking variables
queues = {}
q_max_wait_time = 10000  # in ms
initial_scope = 50  # +-elo when looking for opponents
scope_update_interval = 10000  # time it takes for scope to widen (in ms)
scope_update_ammount = 50  # ammount by which scope widens every scope_update_interval

# Gameplay variables
# white_id, #black_id,#curr_turn,#game_id,#numOfMoves,FEN
games = {}
default_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


class Player:
    def __init__(self, id, username, ELO, playing_as):
        self.id = id
        self.username = username
        self.ELO = ELO
        self.playing_as = playing_as


class Game:

    def __init__(self, game_id, game_room_id, game_mode_id, white_player, black_player, curr_turn, curr_FEN,
                 num_of_moves):
        self.game_id = game_id
        self.game_room_id = game_room_id
        self.game_mode_id = game_mode_id
        self.white_player = white_player
        self.black_player = black_player
        self.curr_turn = curr_turn
        self.curr_FEN = curr_FEN
        self.num_of_moves = num_of_moves


# Websocket communication
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")
thread = None
# holds id's of all sockets that are authorized to communicate as given playerId
authorized_socket = {}


# generates response for given data and code with appropriate headers
def generate_response(data, HTTP_code):
    resp = make_response(jsonify(data), HTTP_code)
    resp.headers['Access-Control-Allow-Origin'] = frontend_url
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    resp.headers['Access-Control-Allow-Methods'] = '*'
    resp.headers['Access-Control-Allow-Credentials'] = 'true'
    return resp


# LOGIN SERVICE HELPERS
def generate_session_token(user_id):
    n = random.randint(1000000000000, 9999999999999)
    n = hashlib.sha256(str(n).encode())
    return str(n.hexdigest())


def generate_refresh_token(user_id):
    n = random.randint(1000000000000, 9999999999999)
    n = hashlib.sha256(str(n).encode())
    return str(n.hexdigest())


def authorize_user(user_id, session_token):
    # making sure userid is a string
    user_id_str = str(user_id)
    if (user_id_str not in Sessions) or (session_token != Sessions[user_id_str]['session_token']):
        return False

    return True


@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    request_data = request.get_json()
    if debug_mode: print("LOGIN REQUEST " + str(request_data))
    user_name = request_data['username']

    # get user data from db
    try:
        db = ChessDB_PT.ChessDB()
        user = db.get_user(user_name)
        user_id = str(user[0])
        user_pass = str(user[2])
        user_elo = str(user[5])
    except Exception as ex:
        if debug_mode: ("DB ERROR" + str(ex))
        return generate_response({"error": "Can't fetch from db"}, 503)

    # user wasn't found in the database ergo wrong username
    if user is None:
        return generate_response({"error": "Username doesn't exist"}, 403)

    # actual user's password doesn't match given
    if user_pass != request_data['hashedPassword']:
        return generate_response({"error": "Incorrect password"}, 403)

    # generate session and refresh token for user
    session_token = generate_session_token(user_id)
    refresh_token = generate_refresh_token(user_id)
    Sessions[user_id] = {'refresh_token': refresh_token, 'session_token': session_token}
    print(refresh_token)
    # create cookie with refresh token, and send back payload with sessionToken
    resp = generate_response({"userId": user_id, "userElo": user_elo, "sessionToken": session_token}, 200)
    # create resfresh token cookie that is only ever sent to /refresh_session path
    resp.set_cookie('refreshToken', refresh_token, domain='127.0.0.1', samesite='None',
                    secure='false')  # path="/refresh_session"
    return resp


# takes refresh token from cookie and generates and returns new session token
@app.route('/refresh_session', methods=['GET', 'OPTIONS'])
def refresh_session():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    if debug_mode: print("REFRESH_SESSION REQUEST " + " " + str(request.cookies))
    user_id = str(request.args['userId'])

    # check if it even contains refresh token cookie
    if not request.cookies.get('refreshToken'):
        if debug_mode: print("Missing refresh token cookie.")
        return generate_response({"error": "Missing refresh token cookie."}, 401)

    refresh_token = str(request.cookies.get('refreshToken'))
    # check if refresh token is valid
    if (user_id not in Sessions) or Sessions[user_id]['refresh_token'] != str(refresh_token):
        if debug_mode: print("Wrong refresh token.")
        return generate_response({"error": "Wrong refresh token."}, 401)

    if debug_mode: print("GOT TOKEN: " + refresh_token)
    if debug_mode: print("HAVE TOKEN: " + Sessions[user_id]['refresh_token'])

    new_session_token = generate_session_token(user_id)
    Sessions[user_id]['session_token'] = new_session_token
    return generate_response({"sessionToken": str(new_session_token)}, 200)


@app.route('/logout', methods=['GET', 'OPTIONS'])
def logout():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    if request.args is None:
        if debug_mode: print('No player id in logout')
        return generate_response({"error": "Missing playerId"}, 400)

    if debug_mode: print("LOGOUT REQUEST " + str(request.args))
    user_id = request.args['userId']

    session_token = request.headers['Authorization']
    if not authorize_user(user_id, session_token):
        return generate_response({"error": "Authorisation failed."}, 401)

    # delete session token for user
    del Sessions[str(user_id)]
    # set cookie to a dummy one
    resp = generate_response({"logout": 'succesfull'}, 200)
    resp.set_cookie('refreshToken', 'none', domain='127.0.0.1', samesite='None', secure='false')
    return resp


@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    request_data = request.get_json()
    username = request_data['username']
    hashed_password = request_data['hashedPassword']
    if debug_mode: print("REGISTER REQUEST " + str(request_data))

    try:
        # handle username taken
        db = ChessDB_PT.ChessDB()
        user = db.get_user(username)
        if user is not None:
            return generate_response({"error": "Username already taken"}, 403)
        # add to database
        db.add_user(username, hashed_password, 'PL', rating.starting_ELO, rating.starting_ELO_deviation,
                    rating.starting_ELO_volatility)
    except Exception as ex:
        if debug_mode: ("DB ERROR" + str(ex))
        return generate_response({"error": "Database error"}, 503)

    return generate_response({"registration": 'succesfull'}, 200)


@app.route('/is_in_game', methods=['GET', 'OPTIONS'])
def is_in_game():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    if debug_mode: print("IS_IN_GAME REQUEST " + str(request.args))
    user_id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    session_token = request.headers['Authorization']
    if not authorize_user(user_id, session_token):
        if debug_mode: print('Authorization failed')
        return generate_response({"error": "Authorisation failed."}, 401)

    # generate info
    data = {"inGame": False}
    game_info = get_is_player_in_game(user_id)
    if not game_info:
        if debug_mode: print('Player not in game!')
        return generate_response(data, 200)

    game = game_info[0]
    playing_as = game_info[1]
    print(game)

    # seperate out opponent and player
    if playing_as == 'w':
        opponent = game.black_player
    else:
        opponent = game.white_player

    data = {"inGame": True,
            "gameId": game.game_room_id,
            "gameMode": game.game_mode_id,
            "playingAs": playing_as,
            "FEN": game.curr_FEN,
            "opponent": {
                "username": opponent.username,
                "ELO": opponent.ELO,
                "playingAs": opponent.playing_as
            }
            }

    return generate_response(data, 200)


@app.route('/player_stats', methods=['GET', 'OPTIONS'])
def get_player_stats():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    if debug_mode: print("PLAYER_STATS REQUEST " + str(request.args))
    user_id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    session_token = request.headers['Authorization']
    if not authorize_user(user_id, session_token):
        if debug_mode: print('Authorization failed')
        return generate_response({"error": "Authorisation failed."}, 401)

    try:
        db = ChessDB_PT.ChessDB()
        user_info = db.get_user_by_id(user_id)
        print(user_info)
        elo = user_info[5]
        deviation = user_info[6]
        games_played = db.count_games(user_id)
        games_won = db.count_wins(user_id)
        games_lost = db.count_losses(user_id)
        draws = db.count_draws(user_id)
    except Exception as ex:
        if debug_mode: ("DB ERROR" + str(ex))
        return generate_response({"error": "Database error"}, 503)

    data = {
        'elo': elo,
        'deviation': deviation,
        'gamesPlayed': games_played,
        'gamesWon': games_won,
        'gamesLost': games_lost,
        'draws': draws
    }

    return generate_response(data, 200)


def generate_example_match_data():
    match1 = {"matchResult": "win",
              'p1Username': 'GG_Kasparov', 'p1PlayedAs': 'White', 'p1ELO': 1420,
              'p2Username': 'Rhyzome', 'p2PlayedAs': 'Black', 'p2ELO': 1587,
              'nOfMoves': '50',
              "hour": "21:37", "dayMonthYear": '22/05/2021'}
    match2 = {"matchResult": "loss",
              'p1Username': 'GG_Kasparov', 'p1PlayedAs': 'White', 'p1ELO': 1410,
              'p2Username': 'BodyW/Organs', 'p2PlayedAs': 'Black', 'p2ELO': 1567,
              "hour": "21:07",
              'nOfMoves': '32',
              "dayMonthYear": '22/05/2021'}

    return [match1, match2]


@app.route('/match_history', methods=['GET', 'OPTIONS'])
def get_history():
    if request.method == "OPTIONS":
        return generate_response({}, 200)

    if debug_mode: print("PLAYER_HISTORY REQUEST " + str(request.args))
    user_id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    session_token = request.headers['Authorization']
    if not authorize_user(user_id, session_token):
        if debug_mode: print('Authorization failed')
        return generate_response({"error": "Authorisation failed."}, 401)

    # set page to 0 if not given in request
    page = 0
    if 'page' in request.args:
        page = request.args['page']
    # num of games on given page, default 10
    games_per_page = 10
    if 'perPage' in request.args:
        games_per_page = request.args['perPage']

    try:
        db = ChessDB_PT.ChessDB()
        start = page * games_per_page
        end = page * games_per_page + games_per_page
        game_history = db.get_games(user_id, start, end)
    except Exception as ex:
        if debug_mode: ("DB ERROR" + str(ex))
        return generate_response({"error": "Database error"}, 503)

    history = []
    # maps results from numbers to strings
    possible_results = {'0.0': 'loss', '0.5': 'draw', '1.0': 'win'}
    for game in game_history:
        try:
            white = db.get_participant('White', game[0])
            black = db.get_participant('Black', game[0])
            numOfMoves = db.count_moves(game[0])

            black_score = str(black[3])
            white_score = str(white[3])
            if black_score not in possible_results or white_score not in possible_results:
                continue

            result = possible_results[black_score]
            if str(white[2]) == user_id: result = possible_results[white_score]
            if str(white[2]) == user_id: result = possible_results[white_score]

            # extract date info from given string
            day_mont_year = str(game[2])[:10]
            hour = str(game[2])[11:16]

            match = {"matchResult": result,
                     'p1Username': str(white[6]), 'p1PlayedAs': 'White', 'p1ELO': str(white[5]),
                     'p2Username': str(black[6]), 'p2PlayedAs': 'Black', 'p2ELO': str(black[5]),
                     "hour": hour,
                     "nOfMoves": numOfMoves,
                     "dayMonthYear": day_mont_year}
            history.append(match)
        except Exception as ex:
            if debug_mode: ("DB ERROR" + str(ex))
            return generate_response({"error": "Cannot fetch from db"}, 503)

    if debug_mode: print(game_history)
    return generate_response(json.dumps(history), 200)


def get_player_from_queue(player_id, game_mode_id):
    if str(game_mode_id) not in queues.copy():
        return False

    for player in queues[str(game_mode_id)]:
        if player[0].id == player_id:
            return player

    return False


def get_player_from_queue_by_sid(sid):
    # get player ID from sid
    player_id = get_id_by_sid(sid)

    if player_id is None:
        return False

    for game_mode_id, queuedPlayers in queues.copy().items():
        for player in queuedPlayers:
            if player[0].id == player_id:
                return [player, game_mode_id]

    return False


@socketio.on('join_queue')
def join_queue(data):
    @copy_current_request_context
    def run_match_maker():
        match_maker()

    global thread
    if thread is None:
        thread = socketio.start_background_task(run_match_maker)

    data_obj = json.loads(data)
    player_id = data_obj['playerId']
    game_mode_id = data_obj['gameModeId']

    # authorize player
    if not check_auth(request.sid, player_id):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    print("Player with id " + str(player_id) + " joined the queue for game mode" + str(game_mode_id))
    join_room('queue' + str(game_mode_id), request.sid)

    # get player elo from db
    try:
        db = ChessDB_PT.ChessDB()
        user = db.get_user_by_id(player_id)
        player_elo = user[5]
        username = user[1]
    except Exception as ex:
        print("DB ERROR" + str(ex))
        return

    # check if player isn't in this queue already
    if get_player_from_queue(player_id, game_mode_id) is not False:
        emit('already_in_queue', {'playerId': player_id}, to=request.sid)
        return

    player = Player(player_id, username, player_elo, 'u')
    # as array playerObject,waitTime (in ms), currentScope
    queues.setdefault(str(game_mode_id), []).append([player, 0, initial_scope])
    print(queues)
    # send initial scope to the player that joined the queue
    emit('update_scope', {'scope': str(initial_scope)}, to=request.sid)
    # send back current queue info to all connected clients
    emit('queue_info', {'playersInQueue': str(len(queues[str(game_mode_id)]))}, to='queue' + str(game_mode_id))


@socketio.on('leave_queue')
def leave_queue(data):
    data_obj = json.loads(data)
    player_id = data_obj['playerId']
    game_mode_id = data_obj['gameModeId']

    # authorize player
    if not check_auth(request.sid, player_id):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    print("Player with id " + player_id + "left the queue for gameId " + str(game_mode_id))

    # if queue for gameId somehow doesn't exist
    if str(game_mode_id) not in queues:
        return

    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue(player_id, game_mode_id)
    if to_be_removed:
        queues[str(game_mode_id)].remove(to_be_removed)
        leave_room('queue' + str(game_mode_id), request.sid)

    # send back success message
    emit('queue_left', {'success': 'true'}, to=request.sid)
    # update all other players waiting in queue
    emit('queue_info', {'playersInQueue': str(len(queues[str(game_mode_id)]))}, to='queue' + str(game_mode_id))


def finish_game(game_info, win_color):
    # notify players of their respective results
    white_sid = authorized_socket[game_info.white_player.id]
    black_sid = authorized_socket[game_info.black_player.id]
    if win_color == 'w' or win_color == "W":
        emit("game_ended", {'result': 'win'}, to=white_sid)
        emit("game_ended", {'result': 'lost'}, to=black_sid)
    elif win_color == 'b' or win_color == "B":
        emit("game_ended", {'result': 'lost'}, to=white_sid)
        emit("game_ended", {'result': 'win'}, to=black_sid)
    else:
        emit("game_ended", {'result': 'draw'}, to=white_sid)
        emit("game_ended", {'result': 'draw'}, to=black_sid)

    game_id = game_info.game_id
    # delete game
    if (str(game_info.game_room_id) in games):
        games.pop(str(game_info.game_room_id), None)

    # update in database
    try:
        db = ChessDB_PT.ChessDB()

        # add match result to db
        curr_turn = game_info.curr_turn
        db.update_scores(str(curr_turn).upper(), game_id)

        # update players' rankings
        white_id = game_info.white_player.id
        black_id = game_info.black_player.id
        white_user_info = db.get_user_by_id(white_id)
        black_user_info = db.get_user_by_id(black_id)

        white_ELO = white_user_info[5]
        white_dv = white_user_info[6]
        white_v = white_user_info[7]
        black_ELO = black_user_info[5]
        black_dv = black_user_info[6]
        black_v = black_user_info[7]

        # game ended by white,ergo he won, else he didn't
        white_result = int(curr_turn == 'w')
        white_ELO, white_dv, white_v, black_ELO, black_dv, black_v = rating.calculate_glicko(white_ELO, white_dv,
                                                                                             white_v, black_ELO,
                                                                                             black_dv, black_v,
                                                                                             white_result)

        db.update_elo(white_id, white_ELO, white_dv, white_v)
        db.update_elo(black_id, black_ELO, black_dv, black_v)

    except Exception as ex:
        print("DB ERROR" + str(ex))


@socketio.on('surrender')
def surrender(data):
    obj = json.loads(data)
    print(obj)

    game_room_id = obj['gameroomId']

    # check if game even exists
    if game_room_id not in games:
        print("GAME ARLEADY GONE!! ")
        emit('bad_move', {'error': 'Game already gone'})
        return

    player_id = obj['playerId']

    # authorize player
    if not check_auth(request.sid, player_id):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    # check if is in the game
    players_game = get_is_player_in_game(player_id)
    if not players_game or players_game[0].game_room_id != game_room_id:
        print("Player doesn't play in this game!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    print("Player with id " + player_id + "surrendered the game")

    game_info = games[game_room_id]
    player_color = players_game[1]
    # get opponents color
    opp_color = 'w'
    if player_color == 'w':
        opp_color = 'b'

    finish_game(game_info, opp_color)


@socketio.on('end_game')
def end_game(data):
    obj = json.loads(data)
    print(obj)

    game_room_id = obj['gameroomId']

    # check if game even exists
    if game_room_id not in games:
        print("GAME ARLEADY GONE!! ")
        emit('bad_move', {'error': 'Game already gone'})
        return

    player_id = obj['playerId']

    # authorize player
    if not check_auth(request.sid, player_id):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    # check if is in the game
    players_game = get_is_player_in_game(player_id)
    if not players_game or players_game[0].game_room_id != game_room_id:
        print("Player doesn't play in this game!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    print("Player with id " + player_id + "checkmated the game")
    game_info = games[game_room_id]
    player_color = players_game[1]

    finish_game(game_info, player_color)


@socketio.on('make_move')
def make_move(data):
    data_obj = json.loads(data)
    print(data_obj)

    # authorize player
    if not check_auth(request.sid, data_obj['playerId']):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    game_room_id = data_obj['gameroomId']
    move = data_obj['move']
    player_id= data_obj['playerId']

    # check if the game exists at all
    if game_room_id not in games:
        print("NO_SUCH_GAME_EXISTS")
        return

    # check if is in the game
    players_game = get_is_player_in_game(player_id)
    if not players_game or players_game[0].game_room_id != game_room_id:
        print("Player doesn't play in this game!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    player_color= players_game[1]
    game_info = games[game_room_id]
    white_id = game_info.white_player.id
    black_id = game_info.black_player.id
    curr_turn = game_info.curr_turn

    # check if it's coming from the wrong player
    if str(curr_turn) != str(player_color):
        # send not ur turn packet
        print("NOT UR TURN")
        return

    # check for illegal moves?
    new_FEN =ChessLogic.is_valid_move(game_info.curr_FEN, move['startingSquare'], move['targetSquare'])
    if not new_FEN:
        #send invalid move packet
        print("INVALID MOVE")
        return

    # send move to opponent
    opponent_sid =  authorized_socket[white_id]
    if player_color=='w':
        opponent_sid=authorized_socket[black_id]

    emit('make_move_local', move, to=opponent_sid)

    #check for checkmates


    # update local game object
    if game_room_id not in games:
        print("NO_SUCH_GAME_EXISTS")
        return
    # get opposite turn
    opp_turn = 'w'
    if curr_turn == 'w':
        opp_turn = 'b'

    games[game_room_id].curr_turn = opp_turn
    games[game_room_id].curr_FEN = new_FEN
    move_order = game_info.num_of_moves
    games[game_room_id].num_of_moves = move_order + 1

    try:
        game_id = game_info.game_id
        db = ChessDB_PT.ChessDB()
        db.add_move(game_id, str(curr_turn).upper(), move_order, move)
    except Exception as ex:
        print("DB ERROR" + str(ex))


def match_maker():
    while True:
        for game_mode_id, players in queues.copy().items():
            for player in players:
                start = timer()
                find_match(game_mode_id, player)
                end = timer()

                time_taken = (end - start) * 1000
                # increment wait time for all players still in queue
                increment_wait_time(game_mode_id, time_taken)


def increment_wait_time(game_mode_id, time_taken):
    for player in queues[game_mode_id]:
        player[1] += time_taken


# get player ID from sid
def get_id_by_sid(sid):
    try:
        player_id = list(authorized_socket.keys())[list(authorized_socket.values()).index(sid)]
        return player_id
    except Exception as ex:
        return None


# try to find a match for given player
def find_match(game_mode_id, player):
    # check if a socket is connected for player
    player_id = player[0].id
    if player_id not in authorized_socket:
        return

    player_elo = player[0].ELO
    player_sid = authorized_socket[player_id]
    player_wait_time = player[1]
    player_curr_scope = player[2]

    # increment scope depending on how long the player has been waiting for
    scope = initial_scope + int(player_wait_time / scope_update_interval) * scope_update_ammount

    # iterate through all possible opponents
    for opponent in list(queues[str(game_mode_id)]):

        # don't match the player with himself
        if opponent == player:
            continue

        opponent_elo = opponent[0].ELO
        opponent_wait_time = opponent[1]
        opponent_scope = initial_scope + int(opponent_wait_time / scope_update_interval) * scope_update_ammount

        # if opponent elo is in scope and players is in his it's a match
        if (player_elo - scope <= opponent_elo <= player_elo + scope) \
                and (opponent_elo - opponent_scope <= player_elo <= opponent_elo + opponent_scope):
            # check if both players are still in queue

            # cache opponent data
            opponent_id = opponent[0].id
            if opponent_id not in authorized_socket:
                continue

            opponent_sid = authorized_socket[opponent_id]

            # remove from queue and leave room
            queues[str(game_mode_id)].remove(player)
            queues[str(game_mode_id)].remove(opponent)
            leave_room('queue' + str(game_mode_id), player_sid)
            leave_room('queue' + str(game_mode_id), opponent_sid)

            # randomise who plays as white 0 for player, 1 for opponent
            white_player = random.randint(0, 1)

            if white_player == 1:
                white_sid = player_sid
                white_player = player[0]
                black_sid = opponent_sid
                black_player = opponent[0]
            else:
                white_sid = opponent_sid
                white_player = opponent[0]
                black_sid = player_sid
                black_player = player[0]

            white_player.playing_as = 'w'
            black_player.playing_as = 'b'

            try:
                # create game in db
                db = ChessDB_PT.ChessDB()
                game_id = db.add_game(white_player.id, float(0.5), black_player.id, float(0.5), "none", [])
                game_id_hash = hashlib.sha256(str(game_id).encode())
                game_room_id = str(game_id_hash.hexdigest())

                # notify the players
                emit("game_found", {'gameId': game_room_id, 'playingAs': 'w', 'gameMode': game_mode_id}, to=white_sid)
                emit("game_found", {'gameId': game_room_id, 'playingAs': 'b', 'gameMode': game_mode_id}, to=black_sid)

                # create gameroom for the two players and add both of them
                join_room(game_room_id, white_sid)
                join_room(game_room_id, black_sid)

                # create game in server storage
                games[game_room_id] = Game(game_id, game_room_id, game_mode_id, white_player, black_player, 'w',
                                           default_FEN, 0)
            except Exception as ex:
                print("DB ERROR" + str(ex))

    # notify player of scope change if it has happened
    if player_curr_scope != scope:
        player[2] = scope
        emit("update_scope", {'scope': scope}, to=player_sid)


@socketio.on('disconnect')
def disconnect():
    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue_by_sid(request.sid)
    if to_be_removed:
        leave_room('queue' + str(to_be_removed[1]))
        queues[str(to_be_removed[1])].remove(to_be_removed[0])

    # remove from game he was in?
    print('Player disconnected ', request.sid)


# returns [game,color] game object with it's info and
# which color the given player is playing ('w'/'b')
# False if player not in game
def get_is_player_in_game(playerId):
    for roomId, game in games.items():
        if game.white_player.id == playerId:
            return [game, 'w']
        if game.black_player.id == playerId:
            return [game, 'b']

    return False


@socketio.on('connect')
def connect():
    print('Player connected! ' + request.sid)
    emit('connect', {})


def check_auth(sid, player_id):
    if (str(player_id) not in authorized_socket) or (sid != authorized_socket[str(player_id)]):
        return False

    return True


@socketio.on("authorize")
def authorize(data):
    if ('sessionToken' not in data) or ('userId' not in data):
        if debug_mode: print("Missing data in socket auth request")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    session_token = data['sessionToken']
    player_id = str(data['userId'])

    # communicate unauthorised access
    if not authorize_user(player_id, session_token):
        if debug_mode: print("Authorization of player" + player_id + " failed")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    # add socket_id to authorized sockets for player
    if debug_mode: print("Authorization of player" + player_id + " succeded")
    authorized_socket[player_id] = request.sid

    # check if player was in a game/lobby and add him back [game,playinsAs]
    game_info = get_is_player_in_game(player_id)
    if game_info:
        game = game_info[0]
        playing_as = game_info[1]

        if debug_mode:
            print("Player " + str(player_id) + " rejoined game " + str(game.game_id) + " as " + str(
                playing_as + " with FEN " + str(game.curr_FEN)))

        join_room(game.game_id, request.sid)
        # game rejoin communicate (in case player was in queue when disconnected)
        emit("game_found",
             {'gameId': game.game_id, 'playingAs': playing_as, 'FEN': game.curr_FEN, 'gameMode': game.game_mode_id},
             to=request.sid)

    emit('authorized', )


# in game chat
@socketio.on("send_chat_to_server")
def send_chat_to_server(data):
    data_obj = json.loads(data)

    player_name = data_obj['playerName']
    text = data_obj['text']
    game_id = data_obj['gameId']
    player_id = data_obj['playerId']

    # authorize player
    if not check_auth(request.sid, player_id):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    # check if player is in the selected game
    game_info = get_is_player_in_game(player_id)
    if not game_info or str(game_info[0].game_room_id) != str(game_id):
        print("Wrong game")
        return

    # send to everyone in the room except sender
    emit('receive_message', {'text': text, 'playerName': player_name}, room=game_id, include_self=False)


socketio.run(app, host='127.0.0.1', port=5000, debug=debug_mode)

# app.run("192.168.1.56", 5000, debug=True)
