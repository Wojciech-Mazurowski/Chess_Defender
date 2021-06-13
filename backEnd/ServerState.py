from timeit import default_timer as timer

########################
# SERVER STATE VARIABLES#
########################

# User login sessions
# userid (string) is key, contains dict with 'session_token' and 'refresh_token'
# ex. tkn=Sessions['3']['refresh_token'] gets refresh token for playerId 3
Sessions = {}

# Matchmaking variables
queues = {}
q_max_wait_time = 10000  # in ms
initial_scope = 1000  # +-elo when looking for opponents
scope_update_interval = 10000  # time it takes for scope to widen (in ms)
scope_update_ammount = 50  # ammount by which scope widens every scope_update_interval

# Gameplay variables
# white_id, #black_id,#curr_turn,#game_id,#numOfMoves,FEN
games = {}
default_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
defender_FEN= "8/8/8/8/8/8/8/8 w KQkq - 0 1"
#TODO HERE YOU CAN CHANGE MAX_TIMES
game_mode_times= [20,20] #defines time constraint IN SECONDS for gametype at index
game_mode_starting_FEN = [default_FEN,defender_FEN]


# Socket auth service
authorized_sockets = {}


#################
# ACCESOR_METHODS#
#################


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


# get player ID from sid
def get_id_by_sid(sid):
    try:
        player_id = list(authorized_sockets.keys())[list(authorized_sockets.values()).index(sid)]
        return player_id
    except Exception as ex:
        return None


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


################
# COMMON CLASSES#
################


class Player:
    def __init__(self, id, username, ELO, playing_as):
        self.id = id
        self.username = username
        self.ELO = ELO
        self.playing_as = playing_as


class Game:

    def __init__(self, game_id, game_room_id, game_mode_id, white_player, black_player, curr_turn, curr_FEN,
                 num_of_moves,timer):
        self.game_id = game_id
        self.game_room_id = game_room_id
        self.game_mode_id = game_mode_id
        self.white_player = white_player
        self.black_player = black_player
        self.curr_turn = curr_turn
        self.curr_FEN = curr_FEN
        self.num_of_moves = num_of_moves
        self.timer=timer


class Timer:
    def __init__(self, max_time):
        self.white_time = max_time
        self.black_time = max_time
        self.last_move_timestamp = timer()

    #returns color that won by time
    def update_timers(self, curr_turn):
        time_passed = timer()- self.last_move_timestamp
        if curr_turn == 'w':
            self.white_time = self.white_time - time_passed
        elif curr_turn == 'b':
            self.black_time = self.black_time - time_passed

        if self.black_time<=0:
            return 'b'
        if self.white_time<=0:
            return 'w'

        self.last_move_timestamp = timer()
        return None

