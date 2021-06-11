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
import {getSessionToken} from "./serverLogic/DataFetcher";

export const GAME_DEBUGING_MODE=false;

function App({socket,sessionToken,userId,gameId,isInGame}) {
    const history = useHistory();
    let routeToMain = () => history.push('/');
    const routeToGame = (gameId) => history.push('/play?id=' + gameId);
    const [loading,setLoading]=useState(true);

    useEffect(() => {
        //try to regenerate the session on reload
        if(sessionToken==='none' && userId){
            getSessionToken().then( (resp)=>{
                if(resp===undefined || !resp.sessionToken){
                    setLoading(false);
                    return;
                }

                if(isInGame){ routeToGame(gameId);}
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
                      {!GAME_DEBUGING_MODE &&  <PrivateRoute path="/" exact component={MainPageScreen} /> }
                      {!GAME_DEBUGING_MODE &&   <PrivateRoute path="/play" component={PlayGameScreen} />}
                      {GAME_DEBUGING_MODE &&  <Route path="/" exact component={MainPageScreen} /> }
                      {GAME_DEBUGING_MODE &&   <Route path="/play" component={PlayGameScreen} />}
                      <Route path="/login" component={LogRegScreen} />
                      <Redirect from="*" to="/" />
                  </Switch>
              </div>
          }
      </div>

      );





}

export default connect(mapAllStateToProps)(App);
