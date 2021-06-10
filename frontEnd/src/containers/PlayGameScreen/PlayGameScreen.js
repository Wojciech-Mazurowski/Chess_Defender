import {Component} from "react";
import GameContainer from "./Components/GameContainer"
import Chat from "./Components/Chat"

import P5Wrapper from "react-p5-wrapper"
import sketch from "./Game/Main";
import {getIsInGame} from "../../serverLogic/DataFetcher";
import PlayersInfo from "./Components/PlayersInfo";
import "./PlayGameScreen.css";
import GameButtons from "./Components/GameButtons";
import {store} from "../../index";
import {connect} from "react-redux";
import {mapAllStateToProps} from "../../redux/reducers/rootReducer";
import {setGameId, setPlayingAs, setCurrentFEN} from "../../redux/actions/gameActions";
import {setIsInGame} from "../../redux/actions/userActions";
import {withRouter} from "react-router-dom"

class PlayGameScreen extends Component {

    constructor(props) {
        super(props);

        this.socket = this.props.socket;
        this.state = {
            gameMode:0,
            loading:true,
            gameStatus: "Draw",
            showResult: false,
            startingFEN:this.props.currentFEN,
            playingAs : this.props.playingAs,
            gameId: this.props.gameId
        }
    }
    async fetchGameData(){
        //check if opponent is in game, if not REROUTE back
        let playerId = this.props.userId;

        let resp= await getIsInGame(playerId,this.props.sessionToken);
        if (resp === undefined) return

        //if not in game REROUTE back
        if(!resp.inGame){
            this.props.dispatch(setIsInGame(false));
            this.props.history.push('/');
            return;
        }

        this.props.dispatch(setGameId(resp.gameId));
        this.props.dispatch(setCurrentFEN(resp.FEN));
        this.props.dispatch(setPlayingAs(resp.playingAs));
        this.props.dispatch(setIsInGame(true));
        await this.setState({startingFEN:resp.FEN,loading:false});
    }

    componentDidMount() {
        this.fetchGameData();

        this.socket.on("game_ended", data => {
            if (data === undefined) return;
            this.setState({gameStatus: data.result, showResult: true});
        });
    }


    async sendEndGame(data,FEN) {
        const storeState=store.getState();
        let playerId = storeState.user.userId;
        let socket =storeState.socket.socket;
        let gameroomId =storeState.game.gameId;

        if (!socket.is_connected)  return;
        await socket.emit("end_game", JSON.stringify({data, gameroomId, playerId,FEN}));
    }

    async sendMove(move,FEN) {
        const storeState=store.getState();
        let playerId = storeState.user.userId;
        let socket =storeState.socket.socket;
        let gameroomId =storeState.game.gameId;

        if ( !socket.is_connected) return;
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

                {!this.state.loading && <Chat gameId={this.state.gameId}/>}
                <GameContainer>
                    {!this.state.loading &&
                        <P5Wrapper
                            sketch={sketch}
                            playingAs={this.props.playingAs}
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

export default connect(mapAllStateToProps)(withRouter(PlayGameScreen));
