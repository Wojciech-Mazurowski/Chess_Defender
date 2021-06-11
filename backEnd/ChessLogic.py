from stockfish import Stockfish


stockfish = Stockfish("./stockfish_13_win.exe",parameters={"Threads": 1,  "Write Debug Log":"true"})

def generate_pos_to_stocknot_dict():
    board_letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    pos_to_stocknot_dict = {}
    for i in range(0, 8):
        for j in range(0, 8):
            cur_letter = board_letters[j]
            pos_to_stocknot_dict[i*8+j] = cur_letter + str(8-i)

    return pos_to_stocknot_dict


pos_to_stocknot_dict = generate_pos_to_stocknot_dict()


def convert_pos_to_stockfish_notation(pos):
    if pos not in pos_to_stocknot_dict:
        return False

    return pos_to_stocknot_dict[pos]

#returns new fen if valid
def is_valid_move(FEN, startSquare, targetSquare):
    stockfish.set_fen_position(FEN)
    stockfish_move = convert_pos_to_stockfish_notation(startSquare) + convert_pos_to_stockfish_notation(targetSquare)
    if stockfish.is_move_correct(stockfish_move):
        stockfish.set_position([stockfish_move])
        return stockfish.get_fen_position()
        
    return False

def is_checkmate(FEN):
    stockfish.set_fen_position(FEN)
    return stockfish.get_evaluation()