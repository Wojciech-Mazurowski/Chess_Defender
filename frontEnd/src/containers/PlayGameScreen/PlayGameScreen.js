import {Component, useContext} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"
import "./PlayGameScreen.css"
import P5Wrapper from "react-p5-wrapper"
import sketch from "./Game/Main";
import {withMyHooks} from "../../context/gameContext";


class PlayGameScreen extends Component{

    constructor(props) {
        super(props);
        this.game = this.props.gameContext;
        this.socket = this.props.socketContext;
        this.socketResponses();
    }

    // single websocket instance for the own application and constantly trying to reconnect.
    componentDidMount() {

    }


    async sendMove(move) {
        if (!this.socket.is_connected) {
            return;
        }
        await this.socket.emit("make_move", move);
    }

    socketResponses(){
        // this.socket.on("make_move", data => {
        //     //make move
        // });

    }

    render() {

        return (
            <div className="PlayGameScreen">
                <Chat/>
                <GameContainer>
                    <P5Wrapper sketch={sketch} playingAs={this.game.playingAs} sendMoveToServer={this.sendMove}/>
                </GameContainer>

            </div>
        );
    }
}

export default withMyHooks(PlayGameScreen);
