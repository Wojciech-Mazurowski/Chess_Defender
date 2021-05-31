import Board from "./board";
import {count_squares_to_edge, Generate_moves, make_a_move} from "./moves";
import CSquare from "./CSquare";




export const Checkboard_size = 800
export const size = Checkboard_size / 8
export const Checkboard = [];
export const pieces_dict = {King: 'k', Pawn: 'p', Knight: 'n', Bishop: 'b', Rook: 'r', Queen: 'q'};
export const textures = {};
export const scalar = 10;
export const pixel_positions = [];
export const rows = Math.floor(Checkboard_size / size);
export const cols = Math.floor(Checkboard_size / size);
export var board = new Board();

function importAll(r) {
    let images = {};
    r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); });
    return images;
}



const images = importAll(require.context('./Pieces', false, /\.(png|jpe?g|svg)$/));
export let playingAs;
export let sendMoveToServer;

export default function sketch (p5) {

    p5.myCustomRedrawAccordingToNewPropsHandler = (props) => {
        console.log("IN P5js" + props.playingAs)
        if (props.playingAs) {
            playingAs = props.playingAs;
        }
        if (props.sendMoveToServer){
            sendMoveToServer = props.sendMoveToServer;
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
        for(let i=0;i<board.grid.length;i++){
            let piece = board.grid[i];
            if(piece.isIntersecting()){
                piece.dragging = 1;
            }
        }

    }
    p5.mouseReleased = function ()
    {
        make_a_move();
        Generate_moves();
        console.log(board.lastmove)
    }


    p5.setup = function () {

        //TODO sprawdzic czy tak mozna ze export bez argumentu i potem poprostu to nadpisuje
        board = new Board(p5);

        p5.createCanvas(1920, 1080, p5.WEBGL);
        board.load_FEN();


        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let square = new CSquare(i, j, size,p5);
                Checkboard.push(square);
                pixel_positions.push([j*size,i*size]);
            }
        }
        count_squares_to_edge();
        Generate_moves();

    };

    p5.draw = function () {
        p5.background(255);
        p5.translate(-1920 / 2, -1080 / 2);
        //translate(100,100);
        for (let i = 0; i < Checkboard.length; i++) {
            Checkboard[i].setstate();
        }
        board.draw_board();
    };
};
