import {
    future_moves,
    future_moves2,
    future_opponent_moves2,
    Generate_moves,
    Generate_opponent_moves, get_white_king_pos, get_black_king_pos,
    moves,
    opponent_moves, future_opponent_moves
} from "./moves";
import {board, pixel_positions, scalar, size} from "./Main"

//   board.color_to_move === 'w' ? ally_king  = get_black_king_pos() : ally_king = get_white_king_pos();

export function simulate_moves_for_ally(grid, ally_moves) {
    let simulation_grid;
    let opponent_king;
    board.color_to_move === 'w' ? opponent_king = get_white_king_pos() : opponent_king = get_black_king_pos();
    let temp_grid = grid.slice();
    Generate_moves(temp_grid, 0, "future");
    let check_flag = 0;
    let future_move;
    for (let i = 0; i < future_moves.length; i++) {
        simulation_grid = simulate_set_grid_by_move(future_moves[i].StartSquare, future_moves[i].EndSquare, temp_grid,future_moves[i].type);
        Generate_opponent_moves(simulation_grid, "future2",);
        for (let j = 0; j < future_opponent_moves2.length; j++) {
            future_move = future_opponent_moves2[j].EndSquare;
            if (opponent_king === future_move) {
                check_flag = 1;
            }
        }
        if (check_flag === 0) {
            ally_moves.push(future_moves[i]);

        }
        check_flag = 0;
    }

}


export function simulate_moves_for_opponent(grid, ally_moves) {
    let simulation_grid;
    let ally_king;
    board.color_to_move === 'b' ? ally_king = get_black_king_pos() : ally_king = get_white_king_pos();
    let temp_grid = grid.slice();
    Generate_moves(temp_grid, 0, "future");
    let stop_flag = 0;
    let future_move;
    console.log(future_moves);
    for (let i = 0; i < future_moves.length; i++) {
        simulation_grid = simulate_set_grid_by_move(future_moves[i].StartSquare, future_moves[i].EndSquare, temp_grid, future_moves[i].type);
        Generate_opponent_moves(simulation_grid, "future2");
        console.log(future_opponent_moves2);
        for (let j = 0; j < future_opponent_moves2.length; j++) {
            future_move = future_opponent_moves2[j];
            if (ally_king === future_move.EndSquare && find_move_in_moves_for_simulation(future_moves[i], ally_moves) !== -1) {
                stop_flag = 1;
            }
        }
        if (stop_flag === 1) {
            console.log("o tego bys nie zrobil");

        }
        stop_flag = 0;
    }


}
function simulate_get_taken(piece){
    piece.did_move = 0;
    piece.color = "none";
    piece.type = 'e'
    piece.type_letter = 'e';
    piece.dragging = false;
    piece.scaled_size = size - scalar;
    piece.possible_moves = [];
    piece.old_x = piece.x;
    piece.old_y = piece.y;
}

function simulate_set_grid_by_move(StartingSquare, TargetSquare, old_grid, type) {
    let simulation_grid = old_grid.map(a => ({...a}));
    console.log("AAAA")
    console.log(simulation_grid);

    if (type === 'C') {
    simulate_get_taken(simulation_grid[TargetSquare]);
    }

    let temp = simulation_grid[StartingSquare];
    simulation_grid[StartingSquare] = simulation_grid[TargetSquare];
    simulation_grid[TargetSquare] = temp;

    return simulation_grid;

}

function find_move_in_moves_for_simulation(move, ally_moves) {
    let flag = 0;
    for (let i = 0; i < ally_moves.length; i++) {
        if (ally_moves[i].EndSquare === move.EndSquare && ally_moves[i].StartSquare === move.StartSquare) {
            flag = 1;
            ally_moves.splice(i, 1);
            i--;
        }
    }
    if (flag === 0) {
        return -1;
    } else {
        return 1;
    }

}
