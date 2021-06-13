//for gamemode 2
import {board, pixel_positions, playingAs} from "./Main";
import Piece from "./Piece";
export const points_dict = {'k': '0', 'p': '1', 'n': '3', 'b': '3', 'r': '5', 'q': '9','K': '0', 'P': '1', 'N': '3', 'B': '3', 'R': '5', 'Q': '9'};
export function add_piece() {
    for (let i = 0; i < board.gameMode2_grid.length; i++) {
        let piece = board.gameMode2_grid[i];
        if (piece.dragging === 1 && piece.type_letter !== 'e') {
            let Target_Square_position = piece.get_closest_position();
            let TargetSquare = pixel_positions.indexOf(Target_Square_position);
            if (board.grid[TargetSquare].type_letter === 'e') {
                board.SetupState -= parseInt(points_dict[piece.type_letter],10);
                let clonedPiece = new Piece(piece.type_letter, board.p5, 100, 100);
                clonedPiece.color = piece.color;
                console.log("przed klonowaniem");
                console.log(piece);
                console.log('hellou  ');
                console.log(clonedPiece);
                board.grid[TargetSquare] = clonedPiece;
                board.set_FEN_from_grid();

            }
            piece.snap_back();
            piece.dragging = 0;
        }
    }

}