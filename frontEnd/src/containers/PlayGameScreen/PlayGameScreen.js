import {Component, useContext} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"
import "./PlayGameScreen.css"
import P5Wrapper from "react-p5-wrapper"
import sketch, {sendMoveToServer} from "./Game/Main";
import {withMyHooks} from "../../context/gameContext";
import {make_a_move, make_opponents_move} from "./Game/moves"

class PlayGameScreen extends Component{

    constructor(props) {
        super(props);
        this.game=this.props.gameContext;
        this.socket= this.props.socketContext;
        this.lastMove= null;
    }

    componentDidMount() {
        this.socket.on("make_move_local", data => {
            if (data === undefined) return;
            console.log("DOSTAEM");
            make_opponents_move(data.startingSquare,data.targetSquare,data.mtype);
        });
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
        let playerId=localStorage.getItem('userId');
        await socket.emit("make_move", JSON.stringify({move,gameroomId,playerId}));
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
