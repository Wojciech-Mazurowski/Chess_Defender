import {
    future_moves,
    future_moves2,
    future_opponent_moves2,
    Generate_moves,
    Generate_opponent_moves, get_white_king_pos,get_black_king_pos,
    moves,
    opponent_moves
} from "./moves";
import {board, pixel_positions} from "./Main"



export function simulate_moves(grid,ally_moves) {
    let simulation_grid;
    let opponent_king;
    let ally_king;
    board.color_to_move === 'w' ? opponent_king  = get_white_king_pos() : opponent_king = get_black_king_pos();
    board.color_to_move === 'w' ? ally_king  = get_black_king_pos() : ally_king = get_white_king_pos();
    let temp_grid = grid.slice();
    Generate_moves(temp_grid,0,"future");
    let check_flag=0;
    let future_move;
    console.log(future_moves);
    for(let i=0;i<future_moves.length;i++)
    {
        simulation_grid = simulate_set_grid_by_move(future_moves[i].StartSquare,future_moves[i].EndSquare,temp_grid);
        Generate_opponent_moves(simulation_grid,"future2",);
        for(let j =0;j<future_opponent_moves2.length;j++)
        {
            future_move =future_opponent_moves2[j].EndSquare;
            if(opponent_king===future_move)//TODO sprwadzac ktory krol
            {
                check_flag=1;
            }
        }
        if(check_flag===0)
        {
           ally_moves.push(future_moves[i]);

        }
        check_flag=0;
    }

}



function simulate_set_grid_by_move(StartingSquare, TargetSquare, old_grid) {
    let simulation_grid = old_grid.slice();

    let temp = simulation_grid[StartingSquare];
    simulation_grid[StartingSquare] = simulation_grid[TargetSquare];
    simulation_grid[TargetSquare] = temp;

    return simulation_grid;

}

function find_move_in_moves_for_simulation(move)
{
    for(let i=0;i<moves.length;i++)
    {
        if(moves[i].EndSquare === move.EndSquare&& moves[i].StartSquare === move.StartSquare){
            return i;
        }
    }
    return -1;
}

