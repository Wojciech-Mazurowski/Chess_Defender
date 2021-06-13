import json

from flask import Flask, request, jsonify, make_response
import ChessDB
import random
import hashlib
from flask_cors import CORS
import RatingSystem
from ServerState import *

frontend_url = 'http://localhost:3000'
domain = '127.0.0.1'
debug_mode = True

# FLASK CONFIG
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secretkey'
app.config['DEBUG'] = True
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/*": {"origins": "*"}})
# TODO Uncomment below when ssl is installed (secure cookies)
# app.config.update(
#     SESSION_COOKIE_HTTPONLY= True,
#     SESSION_COOKIE_SECURE=True,
# )

# COOKIES CONFIG
app.config['SECRET_KEY'] = 'secret!'
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_SAMESITE='None'
)


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
        db = ChessDB.ChessDB()
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
    resp.set_cookie('refreshToken', refresh_token, domain=domain, samesite='None',
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
    resp.set_cookie('refreshToken', 'none', domain=domain, samesite='None', secure='false')
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
        db = ChessDB.ChessDB()
        user = db.get_user(username)
        if user is not None:
            return generate_response({"error": "Username already taken"}, 403)
        # add to database
        db.add_user(username, hashed_password, 'PL', RatingSystem.starting_ELO, RatingSystem.starting_ELO_deviation,
                    RatingSystem.starting_ELO_volatility)
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
            'currentTurn': game.curr_turn,
            "playingAs": playing_as,
            "FEN": game.curr_FEN,
            "opponent": {
                "username": opponent.username,
                "ELO": opponent.ELO,
                "playingAs": opponent.playing_as
            },
            'blackTime': game.timer.black_time,
            'whiteTime': game.timer.white_time
            }

    if game.game_mode_id:
        data = {"inGame": True,
                "gameId": game.game_room_id,
                "gameMode": game.game_mode_id,
                'currentTurn': game.curr_turn,
                "playingAs": playing_as,
                "FEN": game.curr_FEN,
                "opponent": {
                    "username": opponent.username,
                    "ELO": opponent.ELO,
                    "playingAs": opponent.playing_as
                },
                'blackTime': game.timer.black_time,
                'whiteTime': game.timer.white_time,
                'whiteScore': game.defender_state.white_score,
                'blackScore': game.defender_state.black_score
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
        db = ChessDB.ChessDB()
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
        db = ChessDB.ChessDB()
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
