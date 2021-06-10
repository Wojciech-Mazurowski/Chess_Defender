import './App.css';
import LogRegScreen from "./containers/LogRegScreen/LogRegScreen";
import MainPageScreen from "./containers/MainPageScreen/MainPageScreen";
import PlayGameScreen from "./containers/PlayGameScreen/PlayGameScreen";
import NavBar from "./containers/Navigation/NavBar";
import {Switch, Route, Redirect, useHistory} from 'react-router-dom';
import ScrollToTop from "./containers/CommonComponents/ScrollToTop";
import {useEffect, } from "react";
import {mapAllStateToProps} from './redux/reducers/rootReducer'
import {connect} from 'react-redux'
import PrivateRoute from "./containers/CommonComponents/PrivateRouter";
import {getSessionToken} from "./serverLogic/DataFetcher";



function App({socket,sessionToken,userId}) {
    const history = useHistory();
    let routeToMain = () => history.push('/');

    //connect the socket on startup
    useEffect(() => {
        //try to regenerate the session on reload
        if(sessionToken==='none' && userId){
            getSessionToken().then( (resp)=>{
                if(resp===undefined || !resp.sessionToken) return;
                routeToMain();
            }

            );
        }

        socket.connect();
    }, []);

  return (
          <div className="App">
              <ScrollToTop />
                  <Route path="/" component={NavBar}/>
                  <Switch>
                      <PrivateRoute path="/" exact component={MainPageScreen} />
                      <PrivateRoute path="/play" component={PlayGameScreen} />
                      <Route path="/login" component={LogRegScreen} />
                      <Redirect from="*" to="/" />
                  </Switch>
          </div>
  );
}

export default connect(mapAllStateToProps)(App);
