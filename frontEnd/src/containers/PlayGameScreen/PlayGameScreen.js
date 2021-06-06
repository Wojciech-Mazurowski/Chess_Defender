import {Component} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"

import P5Wrapper from "react-p5-wrapper"
import sketch from "./Game/Main";
import {withMyHooks} from "../../context/gameContext";
import {make_opponents_move} from "./Game/moves"
import {getIsInGame} from "../../serverLogic/DataFetcher";
import PlayersInfo from "./Components/PlayersInfo";
import "./PlayGameScreen.css";
import GameButtons from "./Components/GameButtons";


class PlayGameScreen extends Component {

    constructor(props) {
        super(props);
        this.game = this.props.gameContext;
        this.socket = this.props.socketContext;

        this.state = {
            loading:true,
            gameStatus: "Draw",
            showResult: false,
            startingFEN:""
        }

    }

    componentDidMount() {
        //check if opponent is in game, if not REROUTE back
        let playerId = localStorage.getItem('userId');
        getIsInGame(playerId).then( (resp)=>{
            console.log("GOT is in game");
            console.log(resp);
            if (resp === undefined) {

                return;
            }
            //if not in game REROUTE back
            if(!resp.inGame) this.props.routeToMain();

            this.setState({startingFEN:resp.FEN,loading:false});
        }
        );

        this.socket.on("game_ended", data => {
            if (data === undefined) return;
            console.log("DOSTAEM KONIEC");
            console.log(data);
            this.setState({gameStatus: data.result, showResult: true});
            //after 5 seconds reroute to main
            //setTimeout(this.props.routeToMain(), 5000);
        });
    }


    async sendEndGame(socket, data, gameroomId,FEN) {
        if (socket === undefined || !socket.is_connected) {
            //try to recconect to socket
            console.log("socket undefined")
            return;
        }
        console.log("Wyslalem koniec");
        let playerId = localStorage.getItem('userId');
        await socket.emit("end_game", JSON.stringify({data, gameroomId, playerId,FEN}));
    }

    async sendMove(socket, move, gameroomId,FEN) {
        if (socket === undefined || !socket.is_connected) {
            //try to recconect to socket
            console.log("WYSLALEM");
            console.log("socket undefined")
            return;
        }

        let playerId = localStorage.getItem('userId');
        await socket.emit("make_move", JSON.stringify({move, gameroomId, playerId,FEN}));
    }


    render() {

        return (
            <div className="PlayGameScreen">
                {this.state.showResult &&
                <div className="ResultInfo">
                    <p>&nbsp;{this.state.gameStatus}</p>
                    <button disabled={!this.state.showResult} onClick={this.props.routeToMain}>GO BACK</button>
                </div>
                }

                <PlayersInfo/>


                <Chat/>
                <GameContainer>
                    {!this.state.loading &&
                        <P5Wrapper
                            sketch={sketch}
                            game={this.game}
                            socket={this.socket}
                            sendMoveToServer={this.sendMove}
                            sendEndGame={this.sendEndGame}
                            startingFEN={this.state.startingFEN}
                        />
                    }

                </GameContainer>

                <GameButtons/>

            </div>
        );
    }
}

export default withMyHooks(PlayGameScreen);
