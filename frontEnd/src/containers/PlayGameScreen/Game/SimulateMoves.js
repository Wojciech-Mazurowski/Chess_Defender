import {
    future_moves,
    future_moves2,
    future_opponent_moves2,
    Generate_moves,
    Generate_opponent_moves, get_white_king_pos,
    moves,
    opponent_moves
} from "./moves";
import {board, pixel_positions} from "./Main"

var simulation_grid;

export function simulate_moves() {
    Generate_moves(board.grid,0,"future");
    console.log(future_moves);
    let check_flag=0;
    let white_king = get_white_king_pos();
    for(let i=0;i<future_moves.length;i++)
    {
        simulate_set_grid_by_move(future_moves[i].StartSquare,future_moves[i].EndSquare);
        Generate_opponent_moves(simulation_grid,"future2");
        console.log(future_opponent_moves2);
        for(let j =0;j<future_opponent_moves2.length;j++)
        {
            if(white_king===future_opponent_moves2[j].EndSquare)//TODO sprwadzac ktory krol
            {
                check_flag=1;
            }
        }
        if(check_flag===0)
        {
           //console.log("da sie zablokowac");
        }
        check_flag=0;
    }

}



function simulate_set_grid_by_move(StartingSquare, TargetSquare) {
    simulation_grid = board.grid;

    let temp = simulation_grid[StartingSquare];
    simulation_grid[StartingSquare] = simulation_grid[TargetSquare];
    simulation_grid[TargetSquare] = temp;

}

