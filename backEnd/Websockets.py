from flask import copy_current_request_context
from flask_socketio import SocketIO, emit, join_room, leave_room
from timeit import default_timer as timer
import ChessLogic
from REST_API import *
from enum import Enum

debug_mode = True

# SOCKET IO CONFIG
app = app
socketio = SocketIO(app, cors_allowed_origins="*")
thread = None


# SOCKET CONNECTION
def check_auth(sid, player_id):
    if (str(player_id) not in authorized_sockets) or (sid != authorized_sockets[str(player_id)]):
        return False

    return True


@socketio.on('connect')
def connect():
    print('Player connected! ' + request.sid)
    emit('connect', {})


@socketio.on('disconnect')
def disconnect():
    # delete player from queue if he's in it
    to_be_removed = get_player_from_queue_by_sid(request.sid)
    if to_be_removed:
        leave_room('queue' + str(to_be_removed[1]))
        queues[str(to_be_removed[1])].remove(to_be_removed[0])

    print('Player disconnected ', request.sid)

    # if he was in game notify opponent that the player disconnected
    player_id = get_id_by_sid(request.sid)
    if player_id is None:
        return

    game_info = get_is_player_in_game(player_id)
    if game_info:
        game = game_info[0]
        print("SENDING SOCKET STATUS UPDATE")
        emit('update_opponents_socket_status', {'status': 'disconnected'}, room=game.game_room_id, include_self=False)
        leave_room(game.game_room_id, request.sid)


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
    authorized_sockets[player_id] = request.sid

    # check if player was in a game/lobby and add him back [game,playinsAs]
    game_info = get_is_player_in_game(player_id)
    if game_info:
        game = game_info[0]
        playing_as = game_info[1]

        if debug_mode:
            print("Player " + str(player_id) + " rejoined game " + str(game.game_id) + " as " + str(
                playing_as + " with FEN " + str(game.curr_FEN)))

        join_room(game.game_room_id, request.sid)
        # game rejoin communicate (in case player was in queue when disconnected)
        emit("game_found",
             {'gameId': game.game_room_id, 'playingAs': playing_as, 'FEN': game.curr_FEN, 'gameMode': game.game_mode_id},
             to=request.sid)

        # notify opponent that the player reconnected
        print("SENDING SOCKET STATUS UPDATE")
        emit('update_opponents_socket_status', {'status': 'connected'}, room=game.game_room_id,
             include_self=False)

    emit('authorized', )


# MATCHMAKING
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
        db = ChessDB.ChessDB()
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


# try to find a match for given player
def find_match(game_mode_id, player):
    # check if a socket is connected for player
    player_id = player[0].id
    if player_id not in authorized_sockets:
        return

    player_elo = player[0].ELO
    player_sid = authorized_sockets[player_id]
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
            if opponent_id not in authorized_sockets:
                continue

            opponent_sid = authorized_sockets[opponent_id]

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
                db = ChessDB.ChessDB()
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


def finish_game(game_info, win_color):
    # notify players of their respective results
    white_sid = authorized_sockets[game_info.white_player.id]
    black_sid = authorized_sockets[game_info.black_player.id]
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
    if str(game_info.game_room_id) in games:
        games.pop(str(game_info.game_room_id), None)

    # update in database
    try:
        db = ChessDB.ChessDB()

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
        white_ELO, white_dv, white_v, black_ELO, black_dv, black_v = RatingSystem.calculate_glicko(white_ELO, white_dv,
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
    player_id = data_obj['playerId']

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

    player_color = players_game[1]
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
    if not ChessLogic.is_valid_move(game_info.curr_FEN, move['startingSquare'], move['targetSquare']):
        # send invalid move packet
        print("INVALID MOVE")
        return

    # send move to opponent
    opponent_sid = authorized_sockets[white_id]
    if player_color == 'w':
        opponent_sid = authorized_sockets[black_id]

    emit('make_move_local', move, to=opponent_sid)

    # update local game object
    if game_room_id not in games:
        print("NO_SUCH_GAME_EXISTS")
        return

    games[game_room_id].curr_FEN = data_obj['FEN']
    move_order = game_info.num_of_moves
    games[game_room_id].num_of_moves = move_order + 1
    # get opposite turn
    opp_turn = 'w'
    if curr_turn == 'w':
        opp_turn = 'b'
    games[game_room_id].curr_turn = opp_turn

    try:
        game_id = game_info.game_id
        db = ChessDB.ChessDB()
        db.add_move(game_id, str(curr_turn).upper(), move_order, move)
    except Exception as ex:
        print("DB ERROR" + str(ex))


    # check for checkmates
    eval = ChessLogic.is_checkmate(game_info.curr_FEN)
    if eval['type'] == 'mate':
        print(eval)
        finish_game(game_info, curr_turn)





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
    game_info = get_is_player_in_game(player_id)[0]
    if not game_info or str(game_info.game_room_id) != str(game_id):
        print("Wrong game")
        return

    # send to everyone in the room except sender
    emit('receive_message', {'text': text, 'playerName': player_name}, room=game_info.game_room_id, include_self=False)


socketio.run(app, host='127.0.0.1', port=5000, debug=debug_mode)
