import {Component, useContext} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"
import "./PlayGameScreen.css"
import P5Wrapper from "react-p5-wrapper"
import sketch, {sendMoveToServer} from "./Game/Main";
import {withMyHooks} from "../../context/gameContext";
import {board} from "./Game/Main"

class PlayGameScreen extends Component{

    constructor(props) {
        super(props);
        this.game=this.props.gameContext;
        this.socket= this.props.socketContext;
        this.socketSetup();
    }

    blackStyle={
       // transform: 'rotateX(180deg)'
    }

    whiteStyle={
        transform: 'rotateX(0deg)'
    }

    async sendMove(socket,move,gameroomId) {
        if (socket ===undefined || !socket.is_connected) {
            //try to recconect to socket
            console.log("socket undefined")
            return;
        }
        await socket.emit("make_move", JSON.stringify({move,gameroomId}));
    }

    socketSetup(){
        this.socket.on("make_move", data => {
            if (data === undefined) return;

            board.set_FEN_by_move(data.startingSquare,data.targetSquare,false)
        });
    }

    render() {

        return (
            <div className="PlayGameScreen">
                <Chat/>
                <GameContainer style={this.game.playingAs==='b' ? this.blackStyle :this.whiteStyle}>
                    <P5Wrapper
                        sketch={sketch}
                        game={ this.game}
                        socket={this.socket}
                        sendMoveToServer={this.sendMove}
                    />
                </GameContainer>

            </div>
        );
    }
}

export default withMyHooks(PlayGameScreen);
