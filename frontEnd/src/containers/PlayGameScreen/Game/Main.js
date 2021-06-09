import Board, {default_FEN} from "./board";
import {
    check_if_check,
    count_squares_to_edge, Generate_opponent_moves,
    Generate_moves,
    make_a_move
} from "./moves";
import CSquare from "./CSquare";

export const canvas_width = 700;
export const canvas_height = canvas_width;
export const Checkboard_size = canvas_height
export const size = Checkboard_size / 8
export const Checkboard = [];
export const pieces_dict = {King: 'k', Pawn: 'p', Knight: 'n', Bishop: 'b', Rook: 'r', Queen: 'q'};
export const textures = {};
export const scalar = 10;
export const pixel_positions = [];
export const rows = Math.floor(Checkboard_size / size);
export const cols = Math.floor(Checkboard_size / size);
export var board;

function importAll(r) {
    let images = {};
    r.keys().map((item, index) => {
        return images[item.replace('./', '')] = r(item);
    });
    return images;
}


const images = importAll(require.context('./Pieces', false, /\.(png|jpe?g|svg)$/));
export let playingAs;
export let sendMoveToServer;
export let sendEndGame;
export let gameMode;
let startingFEN;

export default function sketch(p5) {

    p5.myCustomRedrawAccordingToNewPropsHandler = (props) => {
        if (props.gameMode) {
            gameMode = props.gameMode;
        }
        if (props.playingAs) {
            playingAs = props.playingAs;
        }
        if (props.sendMoveToServer) {
            sendMoveToServer = props.sendMoveToServer;
        }
        if (props.sendEndGame) {
            sendEndGame = props.sendEndGame
        }
        if (props.startingFEN) {
            startingFEN = props.startingFEN
        }
    }


    p5.preload = function () {
        for (let key in pieces_dict) {
            let value = pieces_dict[key];
            textures[value.toUpperCase()] = p5.loadImage(images['w' + value + ".png"]['default']);
            textures[value] = p5.loadImage(images[value + ".png"]['default']);
        }
    }

    p5.mousePressed = function () {
        for (let i = 0; i < board.grid.length; i++) {
            let piece = board.grid[i];
            if (piece.isIntersecting()) {
                piece.dragging = 1;
            }
        }

    }
    p5.mouseReleased = function () {
        let king_pos = 0;
        make_a_move();
        Generate_opponent_moves(board.grid);
        check_if_check();
        Generate_moves(board.grid, board.check, "released");
    }


    p5.setup = function () {

        //TODO sprawdzic czy tak mozna ze export bez argumentu i potem poprostu to nadpisuje
        board = new Board(p5);

        p5.createCanvas(canvas_height, canvas_width, p5.WEBGL);

        if (startingFEN !== undefined) {
            board.FEN = startingFEN
            console.log(startingFEN)
        } else {
            board.FEN = default_FEN;
        }
        board.load_FEN();


        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let square = new CSquare(i, j, size, p5);
                Checkboard.push(square);
                if (playingAs === 'b') {
                    pixel_positions.push([canvas_width - size - j * size, canvas_height - size - i * size]);
                } else {
                    pixel_positions.push([j * size, i * size]);
                }
            }
        }
        count_squares_to_edge();
        Generate_moves(board.grid, board.check, "setup");
    };

    p5.draw = function () {
        p5.background(255);
        p5.translate(-canvas_height / 2, -canvas_width / 2);
        //translate(100,100);
        for (let i = 0; i < Checkboard.length; i++) {
            Checkboard[i].setstate();
        }
        board.draw_board();
    };
};
