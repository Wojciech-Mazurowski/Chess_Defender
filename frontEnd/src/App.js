import './App.css';
import LogRegScreen from "./containers/LogRegScreen/LogRegScreen";
import MainPageScreen from "./containers/MainPageScreen/MainPageScreen";
import PlayGameScreen from "./containers/PlayGameScreen/PlayGameScreen";
import NavBar from "./containers/Navigation/NavBar";
import {Switch, Route, Redirect, useHistory} from 'react-router-dom';
import ScrollToTop from "./containers/CommonComponents/ScrollToTop";
import {useEffect, useState,} from "react";
import {mapAllStateToProps} from './redux/reducers/rootReducer'
import {connect} from 'react-redux'
import PrivateRoute from "./containers/CommonComponents/PrivateRouter";
import {getGameIsInGame, getSessionToken} from "./serverLogic/DataFetcher";
import {setIsInGame} from "./redux/actions/userActions";
import {setGameId, setGameMode, setPlayingAs} from "./redux/actions/gameActions";

export const GAME_DEBUGING_MODE=false;

function App({socket,sessionToken,userId,gameId,isInGame,dispatch}) {
    const history = useHistory();
    let routeToMain = () => history.push('/');
    const routeToGame = (gameId) => history.push('/play?id=' + gameId);
    const [loading,setLoading]=useState(true);

    function checkIfIsInGame(){
        let resp= getGameIsInGame(userId,sessionToken);
        if (resp === undefined) return

        //if not in game REROUTE back
        if(!resp.inGame && !GAME_DEBUGING_MODE){
            dispatch(setIsInGame(false));
            return;
        }
        dispatch(setGameId(resp.gameId));
        dispatch(setPlayingAs(resp.playingAs));
        dispatch(setGameMode(resp.gameMode));
        dispatch(setIsInGame(true));

    }


    useEffect(() => {
        //try to regenerate the session on reload
        if(sessionToken==='none' && userId){
            getSessionToken().then( (resp)=>{
                if(resp===undefined || !resp.sessionToken){
                    setLoading(false);
                    return;
                }
                if(isInGame==="true"){ routeToGame(gameId);}
                else{ routeToMain();}
                setLoading(false);
            }
            );
        }
        else{
            setLoading(false);
        }
        //connect the socket on startup
        socket.connect();
    }, []);

  return (
      <div>
          {!loading &&
              <div className="App">
                  <ScrollToTop />
                  <Route path="/" component={NavBar}/>
                  <Switch>
                      {<PrivateRoute path="/" exact component={MainPageScreen} /> }
                      {<PrivateRoute path="/play" component={PlayGameScreen} />}
                      <Route path="/login" component={LogRegScreen} />
                      <Redirect from="*" to="/" />
                  </Switch>
              </div>
          }
      </div>

      );





}

export default connect(mapAllStateToProps)(App);
