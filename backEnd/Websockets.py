import json
import string
import time

from flask import Flask, render_template, session, request, copy_current_request_context, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
import ChessDB_PT
import random
import hashlib
from flask_cors import CORS
import queue
from timeit import default_timer as timer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secretkey'
app.config['DEBUG'] = True
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/*": {"origins": "*"}})

# create example games
# moves = [("WHITE", 0, "G1F3"), ("BLACK", 1, "B8A6"), ("WHITE", 2, "G1F3"), ("BLACK", 3, "B8A6")]
# db.add_game(0, '1420', 2, '1500', 'LOSS', 12, 10, 2021, moves)

# Matchmaking variables
queues = {}
q_max_wait_time = 10000  # in ms
initial_scope = 50  # +-elo when looking for opponents
scope_update_interval = 10000;  # time it takes for scope to widen (in ms)
scope_update_ammount = 50;  # ammount by which scope widens every scope_update_interval

# Gameplay variables
# white_id, #black_id,#curr_turn,#game_id,#numOfMoves,FEN
games = {}
default_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

# User login sessions
Sessions = {}

# Websocket communication
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")
thread = None
# holds id's of all sockets that are authorized to communicate as given playerId
authorized_socket = {}


@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp
    else:
        db = ChessDB_PT.ChessDB()
        rf = request.get_json()
        print(rf)
        user = db.get_user(rf['username'])

        if user is None:
            resp = make_response(jsonify(
                {"error": "Username doesn't exist"}), 403)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        if user[2] != rf['hashedPassword']:
            resp = make_response(jsonify(
                {"error": "Incorrect password"}), 403)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        # generate session token for user
        n = random.randint(1000000000000, 9999999999999)
        n = hashlib.sha256(str(n).encode())
        Sessions[str(user[0])] = str(n.hexdigest())

        resp = make_response(jsonify(
            {"userId": user[0], "sessionID": str(n.hexdigest()), "username": user[1]}
        ), 200)

        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'

        return resp


@app.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp
    else:
        rf = request.get_json()
        print(rf)

        if rf is None:
            resp = make_response(jsonify(
                {"error": "Missing playerId"}), 400)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        userId = rf['userId']

        if userId is None or Sessions[str(userId)] != request.headers['Authorization']:
            resp = make_response(jsonify(
                {"error": "Unauthorised logout"}), 403)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        # delete session token for user
        del Sessions[str(userId)]

        resp = make_response(jsonify(
            {"logout": 'succesfull'}
        ), 200)

        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp


@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp
    else:
        db = ChessDB_PT.ChessDB()
        rf = request.get_json()
        print(rf)
        user = db.get_user(rf['username'])

        if user is not None:
            resp = make_response(jsonify(
                {"error": "Username already taken"}), 403)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        db.add_user(rf['username'], rf['hashedPassword'], 'PL', 1000)
        resp = make_response(rf, 200)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp


@app.route('/is_in_game', methods=['GET', 'OPTIONS'])
def is_in_game():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    user_id = request.args['userId']
    # handle user not having a session at all or invalid authorization
    if (str(user_id) not in Sessions) or (request.headers['Authorization'] != Sessions[str(user_id)]):
        resp = make_response(jsonify(
            {"error": "Authorisation failed."}), 401)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    data = {"inGame": False}

    game_info = get_is_player_in_game(user_id)
    if game_info[0] != -1:
        data = {"inGame": True, "FEN": game_info[2], "playingAs": game_info[1], "gameId": game_info[0]}

    print(data)
    resp = make_response(jsonify(data), 200)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = '*'
    return resp


@app.route('/player_stats', methods=['GET', 'OPTIONS'])
def get_player_stats():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    user_id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    if (str(user_id) not in Sessions) or (request.headers['Authorization'] != Sessions[str(user_id)]):
        resp = make_response(jsonify(
            {"error": "Authorisation failed."}), 401)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    # placeholder vars if cannot connect to db
    elo = 1000
    deviaton = 10
    gamesPlayed = 10
    gamesWon = 5
    gamesLost = 5
    draws = 5

    try:
        db = ChessDB_PT.ChessDB()
        user_info = db.get_user_by_id(user_id)
        elo = user_info[5]
        deviaton = 10
        gamesPlayed = db.count_games(user_id)
        gamesWon = db.count_wins(user_id)
        gamesLost = db.count_losses(user_id)
        draws = db.count_draws(user_id)
    except Exception as ex:
        print("DB ERROR" + str(ex))
        resp = make_response(jsonify(
            {"error": "Can't fetch from db"}), 503)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    data_json = jsonify(
        {'elo': elo,
         'deviaton': deviaton,
         'gamesPlayed': gamesPlayed,
         'gamesWon': gamesWon,
         'gamesLost': gamesLost,
         'draws': draws}
    )

    resp = make_response(data_json, 200)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = '*'
    return resp


@app.route('/match_history', methods=['GET', 'OPTIONS'])
def get_history():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    user_id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    if (str(user_id) not in Sessions) or (request.headers['Authorization'] != Sessions[str(user_id)]):
        resp = make_response(jsonify(
            {"error": "Authorisation failed."}), 401)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    game_history = []
    try:
        db = ChessDB_PT.ChessDB()
        game_history = db.get_games(user_id)
    except Exception as ex:
        print("DB ERROR" + str(ex))
        resp = make_response(jsonify(
            {"error": "Can't fetch from db"}), 503)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    print(game_history)
    history = []
    counter = 0
    max_games = 10
    for game in game_history:
        try:
            counter = counter + 1
            if counter >= max_games:
                break

            white = db.get_participant('White', game[0])
            black = db.get_participant('Black', game[0])
            if white[0] == user_id:
                if white[3] == '1':
                    result = "win"
                elif white[3] == '0':
                    result = "loss"
                else:
                    result = "draw"
            else:
                if black[3] == '1':
                    result = "win"
                elif black[3] == '0':
                    result = "loss"
                else:
                    result = "draw"

            match = {"matchResult": result,
                     'p1Username': str(white[6]), 'p1PlayedAs': 'White', 'p1ELO': str(white[5]),
                     'p2Username': str(black[6]), 'p2PlayedAs': 'Black', 'p2ELO': str(black[5]),
                     "hour": "21:37",
                     "dayMonthYear": str(game[2])}
            history.append(match)

        except Exception as ex:
            print("DB ERROR" + str(ex))
            resp = make_response(jsonify(
                {"error": "Can't fetch from db"}), 503)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

    print(history)
    # history = generate_example_match_data()
    resp = make_response(json.dumps(history), 200)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = '*'
    return resp


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


def get_player_from_queue(player_id, game_mode_id):
    if str(game_mode_id) not in queues:
        return False

    for player in queues[str(game_mode_id)]:
        if player[0] == player_id:
            return player

    return False


def get_player_from_queue_by_sid(sid):
    for game_mode_id, queuedPlayers in queues.items():
        for player in queuedPlayers:
            if player[2] == sid:
                return [player, game_mode_id]

    return False


# def match_maker():
#     while True:
#         socketio.sleep(10)
#         if len(queue) > 1:
#             return;


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
        elo = user[5]
    except Exception as ex:
        print("DB ERROR" + str(ex))
        resp = make_response(jsonify(
            {"error": "Can't fetch from db"}), 503)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    # add player to queue if he's not already in it
    if get_player_from_queue(player_id, game_mode_id) is False:
        # as array id,elo,sessionId,waitTime (in ms), currentScope
        queues.setdefault(str(game_mode_id), []).append([player_id, elo, request.sid, 0, initial_scope])
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

    print("Player with id " + player_id + "left the queue for gameId " + str(game_mode_id))
    leave_room('queue' + str(game_mode_id), request.sid)

    # if queue for gameId somehow doesn't exist
    if str(game_mode_id) not in queues:
        return

    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue(player_id, game_mode_id)
    if to_be_removed:
        queues[str(game_mode_id)].remove(to_be_removed)

    # send back success message
    emit('queue_left', {'success': 'true'}, to=request.sid)
    # update all other players waiting in queue
    emit('queue_info', {'playersInQueue': str(len(queues[str(game_mode_id)]))}, to='queue' + str(game_mode_id))


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

    print("Player with id " + player_id + "ended the game")

    player_sid = request.sid

    # [0] white_id,[1] black_id,[2] current_turn (w/b)
    room_info = games[game_room_id]
    white_id = room_info[0]
    black_id = room_info[1]

    white_sid = authorized_socket[white_id]
    black_sid = authorized_socket[black_id]

    # get opponent sid
    opponent_sid = black_sid
    if white_sid != player_sid:
        opponent_sid = white_sid

    # notify players of their respective results

    emit("game_ended", {'result': 'lost'}, to=opponent_sid)
    emit("game_ended", {'result': 'win'}, to=player_sid)

    # delete game
    games.pop(str(game_room_id), None)

    curr_turn = room_info[2]
    game_id = room_info[3]
    try:
        db = ChessDB_PT.ChessDB()
        db.update_scores(str(curr_turn).upper(), game_id)
    except Exception as ex:
        print("DB ERROR" + str(ex))


@socketio.on('make_move')
def make_move(data):
    obj = json.loads(data)
    print(obj)

    # authorize player
    if not check_auth(request.sid, obj['playerId']):
        print("Unathorized!! ")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return

    game_room_id = obj['gameroomId']
    move = obj['move']
    player_sid = request.sid

    # check if the game exists at all
    if game_room_id not in games:
        print("NO_SUCH_GAME_EXISTS")
        return

    # [0] white_id,[1] black_id,[2] current_turn (w/b)
    room_info = games[game_room_id]
    white_id = room_info[0]
    black_id = room_info[1]
    curr_turn = room_info[2]

    white_sid = authorized_socket[white_id]
    black_sid = authorized_socket[black_id]

    print("player sid " + str(white_sid))
    # get opponent sid
    opponent_sid = black_sid
    if white_sid != player_sid:
        opponent_sid = white_sid
    print("opponent_sid " + str(opponent_sid))
    print(authorized_socket)

    # print(game_room_id)
    # print(move)
    # print(player_sid)
    # print(room_info)

    # check if it's coming from the wrong player
    if (curr_turn == 'w' and player_sid != white_sid) or (curr_turn == 'b' and player_sid != black_sid):
        # send not ur turn packet
        print("NOT UR TURN")
        return

    # check for illegal moves?

    # get opposite turn
    opp_turn = 'w'
    if curr_turn == 'w':
        opp_turn = 'b'

    # update local game object
    games[game_room_id][2] = opp_turn
    games[game_room_id][4] = games[game_room_id][4] + 1
    games[game_room_id][5] = obj['FEN']
    print(games[game_room_id])

    # send move to opponent
    emit('make_move_local', move, to=opponent_sid)

    # save move to db
    game_id = games[game_room_id][3]
    move_order = games[game_room_id][4]
    try:
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
        player[3] += time_taken


# try to find a match for given player
def find_match(game_mode_id, player):
    player_id = player[0]
    player_elo = player[1]
    player_sid = player[2]
    player_wait_time = player[3]
    player_curr_scope = player[4]

    # increment scope depending on how long the player has been waiting for
    scope = initial_scope + int(player_wait_time / scope_update_interval) * scope_update_ammount

    # iterate through all possible opponents
    for opponent in list(queues[str(game_mode_id)]):

        # don't match the player with himself
        if opponent == player:
            continue

        opponent_elo = opponent[1]
        opponent_wait_time = opponent[3]
        opponent_scope = initial_scope + int(opponent_wait_time / scope_update_interval) * scope_update_ammount

        # if opponent elo is in scope and players is in his it's a match
        if (player_elo - scope <= opponent_elo <= player_elo + scope) \
                and (opponent_elo - opponent_scope <= player_elo <= opponent_elo + opponent_scope):
            # check if both players are still in queue

            # cache opponent data
            opponent_id = opponent[0]
            opponent_sid = opponent[2]

            # remove from queue and leave room
            print("QUEUE BEFORE ")
            print(queues[str(game_mode_id)])
            queues[str(game_mode_id)].remove(player)
            queues[str(game_mode_id)].remove(opponent)
            leave_room('queue' + str(game_mode_id), player_sid)
            leave_room('queue' + str(game_mode_id), opponent_sid)
            print("QUEUE AFTER")
            print(queues[str(game_mode_id)])

            # randomise who plays as white 0 for player, 1 for opponent
            white_player = random.randint(0, 1)

            if white_player == 1:
                white_sid = player_sid
                white_id = player_id
                white_elo = player_elo

                black_sid = opponent_sid
                black_id = opponent_id
                black_elo = opponent_elo
            else:
                white_sid = opponent_sid
                white_id = opponent_id
                white_elo = opponent_elo

                black_sid = player_sid
                black_id = player_id
                black_elo = player_elo

            # create game in db
            db = ChessDB_PT.ChessDB()
            try:
                game_id = db.add_game(white_id, white_elo, black_id, black_elo, 0, [])
            except Exception as ex:
                print("DB ERROR" + str(ex))

            game_id_hash = hashlib.sha256(str(game_id).encode())
            game_room_id = str(game_id_hash.hexdigest())
            # notify the players
            emit("game_found", {'gameId': game_room_id, 'playingAs': 'w'}, to=white_sid)
            emit("game_found", {'gameId': game_room_id, 'playingAs': 'b'}, to=black_sid)

            # create gameroom for the two players and add both of them
            join_room(game_room_id, player_sid)
            join_room(game_room_id, opponent_sid)

            # white_id, #black_id,#curr_turn,#game_id,#numOfMoves,FEN
            games[game_room_id] = [white_id, black_id, 'w', game_id, 0, default_FEN]

    # notify player of scope change if it has happened
    if player_curr_scope != scope:
        player[4] = scope
        emit("update_scope", {'scope': scope}, to=player_sid)


@socketio.on('disconnect')
def disconnect():
    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue_by_sid(request.sid)
    if to_be_removed != False:
        leave_room('queue' + str(to_be_removed[1]))
        queues[str(to_be_removed[1])].remove(to_be_removed[0])

    # remove from game he was in?
    print('Player disconnected ', request.sid)


# returns -1 if isn't, room id if is
def get_is_player_in_game(playerId):
    for roomId, value in games.items():
        if value[0] == playerId:
            # roomID,playingAS,FEN
            return [roomId, 'w', value[5]]
        if value[1] == playerId:
            return [roomId, 'b', value[5]]

    return [-1, 'n', "undefined"]


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
    auth_token = data['sessionToken']
    player_id = data['userId']

    # communicate unauthorised access
    if (str(player_id) not in Sessions) or Sessions[str(player_id)] != auth_token:
        print("Authorization of player" + str(player_id) + " failed")
        emit('unauthorized', {'error': 'Unauthorized access'})
        return False

    print("Authorization of player" + str(player_id) + " succeded")
    # add socket id to authorized sockets for player
    authorized_socket[str(player_id)] = request.sid

    # check if player was in a game/lobby and add him back [gameId,playinsAs]
    gameinfo = get_is_player_in_game(player_id)
    if gameinfo[0] != -1:
        print("Player " + str(player_id) + " rejoined game " + str(gameinfo[0]) + " as " + str(
            gameinfo[1] + " with FEN " + str(gameinfo[2])))
        join_room(gameinfo[0], request.sid)
        # game rejoin communicata
        emit("game_found", {'gameId': gameinfo[0], 'playingAs': gameinfo[1], 'FEN': gameinfo[2]}, to=request.sid)

    emit('authorized', )


socketio.run(app, host='127.0.0.1', port=5000, debug=True)

# app.run("192.168.1.56", 5000, debug=True)
