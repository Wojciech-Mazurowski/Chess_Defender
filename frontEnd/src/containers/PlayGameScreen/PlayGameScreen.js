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
import {
    setGameId,
    setPlayingAs,
    setCurrentFEN,
    setOpponentELO,
    setOpponentUsername, setGameMode
} from "../../redux/actions/gameActions";
import {setIsInGame} from "../../redux/actions/userActions";
import {withRouter} from "react-router-dom"
import {GAME_DEBUGING_MODE} from "../../App";
import {emit} from "../../redux/actions/socketActions";

class PlayGameScreen extends Component {

    constructor(props) {
        super(props);

        this.socket = this.props.socket;
        this.state = {
            gameMode:0,
            loading:true,
            gameStatus: "Draw",
            showResult: false,
            playingAs : this.props.playingAs,
            gameId: this.props.gameId,
        }
    }
    async fetchGameData(){
        //check if opponent is in game, if not REROUTE back
        let playerId = this.props.userId;

        let resp= await getIsInGame(playerId,this.props.sessionToken);
        if (resp === undefined) return

        //if not in game REROUTE back
        if(!resp.inGame && !GAME_DEBUGING_MODE){
            this.props.dispatch(setIsInGame(false));
            this.props.history.push('/');
            return;
        }

        this.props.dispatch(setGameId(resp.gameId));
        this.props.dispatch(setGameMode(resp.gameMode));
        this.props.dispatch(setCurrentFEN(resp.FEN));
        this.props.dispatch(setPlayingAs(resp.playingAs));
        this.props.dispatch(setIsInGame(true));
        this.props.dispatch(setOpponentUsername(resp.opponent.username));
        this.props.dispatch(setOpponentELO(resp.opponent.ELO));

        if (GAME_DEBUGING_MODE) await this.setDebugingGameValues();
        await this.setState({gameMode:resp.gameMode,loading:false});
    }

    setDebugingGameValues(){
        this.props.dispatch(setPlayingAs('w'));
        this.props.dispatch(setCurrentFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
        this.props.dispatch(setOpponentUsername("YOURSELF"));
    }
    componentDidMount() {
        //style canvas programatically TODO maybe find a more elegant way?

        this.fetchGameData();

        this.socket.on("game_ended", data => {
            if (data === undefined) return;
            this.setState({gameStatus: data.result, showResult: true});
            this.props.dispatch(setIsInGame(false));
        });
    }


    async sendMove(move,FEN) {
        const storeState=store.getState();
        let playerId = storeState.user.userId;
        let socket =storeState.socket.socket;
        let gameroomId =storeState.game.gameId;

        if ( !socket.is_connected) return;
        let eventAndMsg ={
            event:'make_move',
            msg:JSON.stringify({move, gameroomId, playerId,FEN})
        }

        store.dispatch(emit(eventAndMsg));
    }


    render() {
        return (
            <div className={this.props.gameMode==='0'? "PlayGameScreen":"PlayGameScreen chessDefenderGameScreen"} id="PLAY_GAME_SCREEN">
                {this.state.showResult &&
                <div className="ResultInfo">
                    <p>&nbsp;{this.state.gameStatus.toUpperCase()}</p>
                    <button disabled={!this.state.showResult} onClick={()=>{this.props.history.push('/')}}>GO BACK</button>
                </div>
                }

                <PlayersInfo/>

                <Chat/>
                <GameContainer>
                    {!this.state.loading &&
                        <P5Wrapper
                            sketch={sketch}
                            sendMoveToServer={this.sendMove}
                            playingAs={this.props.playingAs}
                            startingFEN={this.props.currentFEN}
                            gameMode={this.props.gameMode}
                        />
                    }

                </GameContainer>

                <GameButtons/>
            </div>
        );
    }
}

export default connect(mapAllStateToProps)(withRouter(PlayGameScreen));
