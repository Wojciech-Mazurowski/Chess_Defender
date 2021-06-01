import {board, pixel_positions, playingAs} from "./Main";


export var moves = [];
export var opponent_moves = [];

class move {
    constructor(starting_square, ending_square, type) {
        this.StartSquare = starting_square;
        this.EndSquare = ending_square;
        this.type = arguments.length === 3 ? type : "n";  // typy ruchow R - roszada dluga, r - roszada krotka , C - capture, P - pion wysuniety do en passant
        //CP - zbicie przez en passant
    }
}

const Directions = [8, -8, -1, 1, 7, -7, 9, -9]; //down up left right, down left, up left, down right, up right
const Numbers_of_squares_to_edge = [];

export function count_squares_to_edge() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let Up = 7 - j;
            let Down = j;
            let Right = 7 - i;
            let Left = i;

            let matrix_to_index = j * 8 + i;

            Numbers_of_squares_to_edge[matrix_to_index] =
                [Up, Down, Left, Right, Math.min(Up, Left), Math.min(Down, Right), Math.min(Up, Right), Math.min(Down, Left)];
        }

    }

}


export function Generate_moves() {
    moves = [];


    for (let startSquare = 0; startSquare < 64; startSquare++) {
        let p = board.grid[startSquare];
        if (p.color === board.color_to_move && board.check === 0  && board.color_to_move === playingAs) { //TODO removed for now
            let type = p.type_letter;
            if (type === 'b' || type === 'r' || type === 'q' || type === 'B' || type === 'R' || type === 'Q') {
                Get_long_moves(startSquare, p, "moves");
            } else if (type === 'p' || type === 'P') {
                Get_Pawn_moves(startSquare, p, "moves");
            } else if (type === 'n' || type === 'N') {
                Get_Knight_moves(startSquare, p, "moves");
            }
        }


    }
    for (let startSquare = 0; startSquare < 64; startSquare++) {
        let p = board.grid[startSquare];
        if (p.color === board.color_to_move) {
            let type = p.type_letter;
            if (type === 'k' || type === 'K') {
                Get_king_moves(startSquare, p, "moves");
            }

        }
    }
    if(board.check===1&&moves.length===0)
    {
        console.log("tu szachmat");
    }

}


export function Generate_opponent_moves() { //used for checks
    opponent_moves = [];


    for (let startSquare = 0; startSquare < 64; startSquare++) {
        let p = board.grid[startSquare];
        if (p.color !== board.color_to_move) {
            let type = p.type_letter;
            if (type === 'b' || type === 'r' || type === 'q' || type === 'B' || type === 'R' || type === 'Q') {
                Get_long_moves(startSquare, p, "all_moves");
            } else if (type === 'p' || type === 'P') {
                Get_Pawn_moves(startSquare, p, "all_moves");
            } else if (type === 'k' || type === 'K') {
                Get_king_moves(startSquare, p, "all_moves");
            } else if (type === 'n' || type === 'N') {
                Get_Knight_moves(startSquare, p, "all_moves");
            }
        }

    }

}


function Get_Pawn_moves(startSquare, piece, mode) {
    let Can_go_up = Numbers_of_squares_to_edge[startSquare][0];
    //TODO can go up to tak naprawde ile jeest do konca krawedzi squarow muszE to zmienic xD
    piece.color === 'w' ? Can_go_up = Numbers_of_squares_to_edge[startSquare][1] : Can_go_up = Numbers_of_squares_to_edge[startSquare][0];
    let Target = 0;
    if (Can_go_up > 0 && piece.did_move === 0) {
        for (let i = 0; i < 2; i++) {
            piece.color === 'w' ? Target = startSquare + Directions[1] * (i + 1) : Target = startSquare + Directions[0] * (i + 1)
            let Piece_on_Target = board.grid[Target];
            if (Piece_on_Target.type_letter !== 'e') {
                break;
            } else {
                if (mode === "all_moves") {
                    if (i === 0) {
                        opponent_moves.push(new move(startSquare, Target));
                    } else {
                        opponent_moves.push(new move(startSquare, Target, 'P'));
                    }

                } else {
                    if (i === 0) {
                        moves.push(new move(startSquare, Target));
                    } else {
                        moves.push(new move(startSquare, Target, 'P'));
                    }
                }
            }

        }
    } else if (Can_go_up > 0 && piece.did_move === 1) {
        piece.color === 'w' ? Target = startSquare + Directions[1] : Target = startSquare + Directions[0];
        let Piece_on_Target = board.grid[Target];
        if (mode === "all_moves") {
            if (Piece_on_Target.type_letter === 'e') {
                opponent_moves.push(new move(startSquare, Target));
            }
        } else {
            if (Piece_on_Target.type_letter === 'e') {
                moves.push(new move(startSquare, Target));
            }
        }

    }
//5 i 7     //TODO
    //EN PASSEANT
    if (board.lastmove.type === 'P') {
        let Target = board.lastmove.EndSquare;
        if (Math.abs(startSquare - Target) === 1) {
            piece.color === 'w' ? Target = Target + Directions[1] : Target = Target + Directions[0];

            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target, 'CP'));
            } else {
                moves.push(new move(startSquare, Target, 'CP'));
            }
        }
    }


    //bicie pionow oponenta
    if (Can_go_up > 0) {
        piece.color === 'w' ? Target = startSquare + Directions[5] : Target = startSquare + Directions[4];
        let Piece_on_Target = board.grid[Target];

        if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.color !== piece.color) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target, 'C'));
            } else {
                moves.push(new move(startSquare, Target, 'C'));
            }

        }
        piece.color === 'w' ? Target = startSquare + Directions[7] : Target = startSquare + Directions[6];
        Piece_on_Target = board.grid[Target];
        if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.color !== piece.color) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target, 'C'));
            } else {
                moves.push(new move(startSquare, Target, 'C'));
            }

        }
    }


}


function check_if_promotion(piece, targetsquare) {
    let is_on_last_square;
    piece.color === 'w' ? is_on_last_square = Numbers_of_squares_to_edge[targetsquare][1] : is_on_last_square = Numbers_of_squares_to_edge[targetsquare][0];

    if (is_on_last_square === 0) {
        if (piece.color === 'w') {
            piece.type = 'Q';
            piece.type_letter = 'Q';
        } else {
            piece.type = 'q';
            piece.type_letter = 'q';
        }
    }
}

function is_square_save(targetSquare) {
    for (let i = 0; i < opponent_moves.length; i++) {
        if (opponent_moves[i]['EndSquare'] === targetSquare) {
            return -1
        }
    }
    return 1
}

function Get_king_moves(startSquare, piece, mode) {
    //TODO
    //Jak juz bede mial all to musze sprawdzac czy krol nie chce sie ruszyc na czyjes miejsce
    for (let i = 0; i < Directions.length; i++) {
        if (Numbers_of_squares_to_edge[startSquare][i] > 0) {
            let Target = startSquare + Directions[i];
            let Piece_on_Target = board.grid[Target];
            if (!(Piece_on_Target.type_letter !== 'e' && Piece_on_Target.color === piece.color)) {
                if (is_square_save(Target) === 1) {
                    if (mode === "all_moves") {
                        opponent_moves.push(new move(startSquare, Target));
                    } else {
                        moves.push(new move(startSquare, Target));
                    }
                    if (Piece_on_Target.color !== piece.color) {

                        if (mode === "all_moves") {
                            opponent_moves[opponent_moves.length - 1].type = 'C';
                        } else {
                            moves[moves.length - 1].type = 'C';
                        }
                    }
                }
            }
        }
    }


    if (piece.did_move === 0) {

        let target = startSquare + Directions[3] * 3;
        let Piece_on_Target = board.grid[target];
        if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.did_move === 0) {
            //roszada krótka
            if (board.grid[startSquare + Directions[3] * 2].type_letter === 'e' && board.grid[startSquare + Directions[3]].type_letter === 'e')
                if (mode === "all_moves") {
                    opponent_moves.push(new move(startSquare, target - 1, 'r'));
                } else {
                    moves.push(new move(startSquare, target - 1, 'r'));
                }
        }

        //roszada dluga

        target = startSquare + Directions[2] * 4;
        Piece_on_Target = board.grid[target];
        if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.did_move === 0) {
            if (board.grid[startSquare + Directions[2] * 2].type_letter === 'e' && board.grid[startSquare + Directions[2]].type_letter === 'e'
                && board.grid[startSquare + Directions[2] * 3].type_letter === 'e') {
                if (mode === "all_moves") {
                    opponent_moves.push(new move(startSquare, target + 2, 'R'));
                } else {
                    moves.push(new move(startSquare, target + 2, 'R'));
                }
            }
        }


    }
    //

}


function Get_Knight_moves(startSquare, piece, mode) {
    //TODO
    //to mozna skrocic forem, ale trzeba dac te *2+1 *2-1 etc do jakiegos dictonary i tez iterowac zzz dodaj tutaj tez move type C jak bedzie bicie, ale to jak juz zrobisz for
    if (Numbers_of_squares_to_edge[startSquare][0] > 1 && Numbers_of_squares_to_edge[startSquare][3] > 0) {
        let Target = startSquare + Directions[0] * 2 + 1;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }
            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

            }

        }
    }

    if (Numbers_of_squares_to_edge[startSquare][0] > 1 && Numbers_of_squares_to_edge[startSquare][2] > 0) {
        let Target = startSquare + Directions[0] * 2 - 1;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }
            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }
            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][0] > 0 && Numbers_of_squares_to_edge[startSquare][3] > 1) {
        let Target = startSquare + Directions[0] + 2;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }
            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][0] > 0 && Numbers_of_squares_to_edge[startSquare][2] > 1) {
        let Target = startSquare + Directions[0] - 2;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][1] > 1 && Numbers_of_squares_to_edge[startSquare][3] > 0) {
        let Target = startSquare + Directions[1] * 2 + 1;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][1] > 1 && Numbers_of_squares_to_edge[startSquare][2] > 0) {
        let Target = startSquare + Directions[1] * 2 - 1;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }
            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][1] > 0 && Numbers_of_squares_to_edge[startSquare][2] > 1) {
        let Target = startSquare + Directions[1] - 2;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

            }
        }
    }

    if (Numbers_of_squares_to_edge[startSquare][1] > 0 && Numbers_of_squares_to_edge[startSquare][3] > 1) {
        let Target = startSquare + Directions[1] + 2;
        let Piece_on_target = board.grid[Target];
        if (!(Piece_on_target.type_letter !== 'e' && Piece_on_target.color === piece.color)) {
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            if (Piece_on_target.type_letter !== 'e' && Piece_on_target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

            }
        }
    }
}


function Get_long_moves(startSquare, piece, mode) {
    let Start = 0;
    let End = 8;
    if (piece.type_letter === 'b' || piece.type_letter === 'B') {
        Start = 4;
    } else if (piece.type_letter === 'R' || piece.type_letter === 'r') {
        End = 4;
    }

    for (let i = Start; i < End; i++) {
        // Loop we wszystkie kierunki i przez wszystkie mozliwe pola aż do krawędzi lub napotkania oponenta
        for (let j = 0; j < Numbers_of_squares_to_edge[startSquare][i]; j++) {
            let Target = startSquare + Directions[i] * (j + 1);  // poruszanie sie o offset (taki fajny myk na 1d tablicy)
            let Piece_on_Target = board.grid[Target];

            //zablokowany przez zioma:
            if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.color === piece.color) {
                break;
            }
            if (mode === "all_moves") {
                opponent_moves.push(new move(startSquare, Target));
            } else {
                moves.push(new move(startSquare, Target));
            }

            //przez oponenta
            if (Piece_on_Target.type_letter !== 'e' && Piece_on_Target.color !== piece.color) {
                if (mode === "all_moves") {
                    opponent_moves[opponent_moves.length - 1].type = 'C';
                } else {
                    moves[moves.length - 1].type = 'C';
                }

                break;
            }
        }
    }
}

function get_move(StartSquare, TargetSquare) {
    for (let i = 0; i < moves.length; i++) {
        if (moves[i].StartSquare === StartSquare && moves[i].EndSquare === TargetSquare) {
            return moves[i];
        }
    }
    return board.lastmove;
}

function check_move(StartSquare, TargetSquare) {
    for (let i = 0; i < moves.length; i++) {
        if (moves[i].StartSquare === StartSquare && moves[i].EndSquare === TargetSquare) {
            return moves[i];
        }
    }
    return -1;
}

export function get_pixel_position_from_pixel_positon_array(pos) { //thanks javascript
    let position;
    for (let i = 0; i < pixel_positions.length; i++) {
        if (pos[0] === pixel_positions[i][0] && pos[1] === pixel_positions[i][1]) {
            position = pixel_positions[i]
            break;
        }
    }
    return position
}

export function Distance_between_points(x1, y1, x2, y2) {
    let y = x2 - x1;
    let x = y2 - y1;

    return Math.sqrt(x * x + y * y);
}

export function check_if_check() {

    let enemyKingPos;

    board.color_to_move === 'w' ? enemyKingPos = get_white_king_pos() : enemyKingPos = get_black_king_pos();



    for (let i = 0; i < opponent_moves.length; i++) {
        if (enemyKingPos === opponent_moves[i]['EndSquare']) {
            board.check = 1;
        }
    }


}

export function make_a_move() {
    for (let i = 0; i < board.grid.length; i++) {
        let piece = board.grid[i];
        if (piece.dragging === 1 && piece.type_letter !== 'e') {
            let Target_Square_position = piece.get_closest_position();
            let Starting_Square_position = [piece.old_x, piece.old_y]

            let StartingSquare = pixel_positions.indexOf(get_pixel_position_from_pixel_positon_array(Starting_Square_position)); //TODO optymalizacja robie to drugi raz w set fen by move!!!
            let TargetSquare = pixel_positions.indexOf(Target_Square_position);
            board.lastmove = get_move(StartingSquare, TargetSquare);
            if (Target_Square_position[0] !== Starting_Square_position[0] || Target_Square_position[1] !== Starting_Square_position[1]) {
                let move = check_move(StartingSquare, TargetSquare);
                if (move !== -1) {


                    if (board.color_to_move === 'b') {
                        board.numOfMoves += 1;
                    }
                    board.lastPawnMoveOrCapture += 1;
                    //TODO zbijanko + moze case z tego zrob

                    if (move.type === 'R' || move.type === 'r') {
                        let Target;
                        let rook_pos;
                        move.type === 'r' ? Target = StartingSquare + 2 : Target = StartingSquare - 2;
                        board.change_Turn();

                        board.set_FEN_by_move(StartingSquare, Target, true); //przenies krola
                        piece.snap();

                        move.type === 'r' ? rook_pos = StartingSquare + 3 : rook_pos = StartingSquare - 4;
                        move.type === 'r' ? Target = rook_pos - 2 : Target = rook_pos + 3;
                        board.set_FEN_by_move(rook_pos, Target,true); // przenies  wieze

                        board.grid[Target].did_move = 1;
                        board.grid[Target].snap_back();


                    } else {
                        if (move.type === 'C') {
                            board.lastPawnMoveOrCapture = 0;
                            board.grid[TargetSquare].get_taken();
                        } else if (move.type === 'CP') {
                            let EP_target;
                            piece.color === 'w' ? EP_target = TargetSquare + Directions[0] : EP_target = TargetSquare + Directions[1];
                            board.grid[EP_target].get_taken();
                            board.lastPawnMoveOrCapture = 0;

                        }

                        if (piece.type_letter === 'p' || piece.type_letter === 'P') {
                            check_if_promotion(piece, TargetSquare);
                            board.lastPawnMoveOrCapture = 0;
                        }
                        //kolejnosc wazna
                        board.change_Turn();
                        board.set_FEN_by_move(StartingSquare, TargetSquare,true);

                        piece.snap();
                    }
                    piece.did_move = 1;
                } else {
                    piece.snap_back();
                }
            } else {
                piece.snap();
            }
            piece.dragging = 0;


        }
    }
}

export function get_white_king_pos() {
    for (let i = 0; i < board.grid.length; i++) {
        if (board.grid[i].type_letter === 'K') {
            return board.grid[i].get_grid_pos()
        }
    }
    return -1;
}

export function get_black_king_pos() {
    for (let i = 0; i < board.grid.length; i++) {
        if (board.grid[i].type_letter === 'k') {
            return board.grid[i].get_grid_pos()
        }
    }
    return -1;
}