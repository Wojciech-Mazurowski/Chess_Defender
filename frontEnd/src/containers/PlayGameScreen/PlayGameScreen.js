import {Component} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"

import P5Wrapper from "react-p5-wrapper"
import sketch from "./Game/Main";
import {withMyHooks} from "../../context/gameContext";
import {getIsInGame} from "../../serverLogic/DataFetcher";
import PlayersInfo from "./Components/PlayersInfo";
import "./PlayGameScreen.css";
import GameButtons from "./Components/GameButtons";


class PlayGameScreen extends Component {

    constructor(props) {
        super(props);

        this.socket = this.props.socketContext;
        this.state = {
            gameMode:0,
            loading:true,
            gameStatus: "Draw",
            showResult: false,
            startingFEN:"",
            playingAs : this.props.gameContext.playingAs,
            gameId: this.props.gameContext.gameId
        }

    }

    componentDidMount() {
        //check if opponent is in game, if not REROUTE back
        let playerId = localStorage.getItem('userId');
        getIsInGame(playerId).then( (resp)=>{
            if (resp === undefined) return
            //if not in game REROUTE back
            if(!resp.inGame){
                this.props.routeToMain();
                return;
            }

            this.setState({
                startingFEN:resp.FEN,
                playingAs:resp.playingAs,
                gameId:resp.gameId,
                loading:false
            });
        }
        );

        this.socket.on("game_ended", data => {
            if (data === undefined) return;

            this.setState({gameStatus: data.result, showResult: true});
            //setTimeout(this.props.routeToMain(), 5000);  //after 5 seconds reroute to main
        });
    }


    async sendEndGame(socket, data, gameroomId,FEN) {
        if (socket === undefined || !socket.is_connected)  return;

        let playerId = localStorage.getItem('userId');
        await socket.emit("end_game", JSON.stringify({data, gameroomId, playerId,FEN}));
    }

    async sendMove(socket, move, gameroomId,FEN) {
        if (socket === undefined || !socket.is_connected) return;

        let playerId = localStorage.getItem('userId');
        await socket.emit("make_move", JSON.stringify({move, gameroomId, playerId,FEN}));
    }


    render() {

        return (
            <div className="PlayGameScreen">
                {this.state.showResult &&
                <div className="ResultInfo">
                    <p>&nbsp;{this.state.gameStatus.toUpperCase()}</p>
                    <button disabled={!this.state.showResult} onClick={this.props.routeToMain}>GO BACK</button>
                </div>
                }

                <PlayersInfo/>

                <Chat gameId={this.state.gameId}/>
                <GameContainer>
                    {!this.state.loading &&
                        <P5Wrapper
                            sketch={sketch}
                            playingAs={this.state.playingAs}
                            gameId={this.state.gameId}
                            socket={this.socket}
                            sendMoveToServer={this.sendMove}
                            sendEndGame={this.sendEndGame}
                            startingFEN={this.state.startingFEN}
                            gameMode={this.state.gameMode}
                        />
                    }

                </GameContainer>

                <GameButtons/>

            </div>
        );
    }
}

export default withMyHooks(PlayGameScreen);
