import json

import gevent
from flask import Flask, render_template, session, request, copy_current_request_context, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
import ChessDB_PT
import random
import hashlib
from flask_cors import CORS
import queue

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secretkey'
app.config['DEBUG'] = True
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/*": {"origins": "*"}})

db = ChessDB_PT.ChessDB()
db.create_db()

# create example games
# moves = [("WHITE", 0, "G1F3"), ("BLACK", 1, "B8A6"), ("WHITE", 2, "G1F3"), ("BLACK", 3, "B8A6")]
# db.add_game(0, '1420', 2, '1500', 'LOSS', 12, 10, 2021, moves)

# Matchmaking variables
queue = []
q_max_wait_time = 10000  # in ms
initial_scope = 50  # +-elo when looking for opponents
scope_update_interval = 10000;  # time it takes for scope to widen (in ms)
scope_update_ammount = 50;  # ammount by which scope widens every scope_update_interval

# User login sessions
Sessions = {}

# Websocket communication
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins="*")
thread = None


@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == "OPTIONS":
        resp = jsonify({})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp
    else:
        rf = request.get_json()
        print(rf)
        user = db.get_user(rf['username'])

        if user is None:
            resp = make_response(jsonify(
                {"error": "Username doesn't exist"}), 401)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        if user[2] != rf['hashedPassword']:
            resp = make_response(jsonify(
                {"error": "Incorrect password"}), 401)
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
                {"error": "Unauthorised logout"}), 401)
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
        rf = request.get_json()
        print(rf)
        user = db.get_user(rf['username'])

        if user is not None:
            resp = make_response(jsonify(
                {"error": "Username already taken"}), 401)
            resp.headers['Access-Control-Allow-Origin'] = '*'
            resp.headers['Access-Control-Allow-Headers'] = '*'
            return resp

        db.add_user(rf['username'], rf['hashedPassword'], 'PL', 1000)
        resp = make_response(rf, 200)
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

    id = request.args['userId']

    # handle user not having a session at all or invalid authorization
    if (str(id) not in Sessions) or (request.headers['Authorization'] != Sessions[str(id)]):
        resp = make_response(jsonify(
            {"error": "Authorisation failed."}), 401)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = '*'
        return resp

    # game_history = db.get_games(id)
    game_history = []
    print(game_history)

    history = []
    for game in game_history:
        white = db.get_participant('White', game[0])
        black = db.get_participant('Black', game[0])
        if white[0] == id:
            if white[3] == '1':
                result = "WIN"
            elif white[3] == '0':
                result = "LOSS"
            else:
                result = "DRAW"
        else:
            if black[3] == '1':
                result = "WIN"
            elif black[3] == '0':
                result = "LOSS"
            else:
                result = "DRAW"

        match = {"matchResult": result,
                 'p1Username': white[6], 'p1PlayedAs': 'White', 'p1ELO': white[5],
                 'p2Username': black[6], 'p2PlayedAs': 'Black', 'p2ELO': black[5],
                 "hour": "21:37",
                 "dayMonthYear": game[2]}
        history.append(match)

    history = generate_example_match_data()
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


def get_player_from_queue(player_id):
    for item in queue:
        if item[0] == player_id:
            return item

    return False


# def match_maker():
#     while True:
#         socketio.sleep(10)
#         if len(queue) > 1:
#             return;


@socketio.on('join_queue')
def join_queue(player_id):

    @copy_current_request_context
    def run_match_maker():
        match_maker()

    global thread
    if thread is None:
        thread = socketio.start_background_task(run_match_maker)

    print("Player with id " + player_id + " joined the queue")
    join_room('queue')

    # get player elo from db
    elo = db.get_user_by_id(player_id)[5]

    # add player to queue if he's not already in it
    if get_player_from_queue(player_id) is False:
        # as array id,elo,sessionId,waitTime (in ms)
        queue.append([player_id, elo, request.sid, 0])
        print(queue)

    # send back current queue info to all connected clients
    emit('queue_info', {'playersInQueue': str(len(queue))}, to='queue')


@socketio.on('leave_queue')
def leave_queue(player_id):
    print("Player with id " + player_id + "left the queue")
    leave_room('queue')

    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue(player_id)
    if to_be_removed != False:
        queue.remove(to_be_removed)

    # send back success message
    emit('queue_left', {'success': 'true'}, to='queue')

@socketio.on('make_move')
def make_move(move):
    print(move)

def match_maker():
    while True:
        if len(queue) > 1:
            for player in queue:
                print("Trying to match " + str(player))
                time_taken = find_match(player)
                # increment wait time for all players still in queue
                increment_wait_time(time_taken)


def increment_wait_time(time_taken):
    for player in queue:
        player[3] += time_taken


# try to find a match for given player
def find_match(player):
    player_id = player[0]
    player_elo = player[1]
    player_sid = player[2]
    player_wait_time = player[3]

    # increment scope depending on how long the player has been waiting for
    scope = initial_scope + player_wait_time * 2
    print(scope)
    # iterate through all possible opponents
    for opponent in queue:

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
            queue.remove(player)
            queue.remove(opponent)
            leave_room('queue', player_sid)
            leave_room('queue', opponent_sid)

            #randomise who plays as white 0 for player, 1 for opponent
            white_player =random.randint(0,1)

            # create gamein db to get gameID
            if white_player==0:
                game_id = db.add_game(player_id, player_elo, opponent_id, opponent_elo, 'NONE', [])
                # notify the players
                emit("game_found", {'gameId': game_id, 'playingAs':'w'}, to=player_sid)
                emit("game_found", {'gameId': game_id, 'playingAs':'b'}, to=opponent_sid)
            else:
                game_id = db.add_game(opponent_id, opponent_elo,player_id, player_elo, 'NONE', [])
                # notify the players
                emit("game_found", {'gameId': game_id, 'playingAs':'b'}, to=player_sid)
                emit("game_found", {'gameId': game_id, 'playingAs':'w'}, to=opponent_sid)

            # create gameroom for the two players and add both of them
            game_room_id = "g_" + str(game_id)
            join_room(game_room_id, player_sid)
            join_room(game_room_id, opponent_sid)

    time_taken = 1
    return time_taken


@socketio.on('disconnect')
def disconnect():
    leave_room('queue')
    # remove from room/queue if was in one
    print('Client disconnected ', request.sid)


@socketio.event
def connect():
    print('Player connected! ' + request.sid)
    emit('my_response', {'data': 'Connected', 'count': 0})


socketio.run(app, host="127.0.0.1", port=5000, debug=True)

# app.run("127.0.0.1", 5000, debug=True)
