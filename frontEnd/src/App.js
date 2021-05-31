import './App.css';
import LogRegScreen from "./containers/LogRegScreen/LogRegScreen";
import MainPageScreen from "./containers/MainPageScreen/MainPageScreen";
import PlayGameScreen from "./containers/PlayGameScreen/PlayGameScreen";
import NavBar from "./containers/Navigation/NavBar";
import {BrowserRouter as Router, Switch, Route, Redirect} from 'react-router-dom';
import {SocketContext, socket} from './context/socketContext';
import {GameProvider} from './context/gameContext';

localStorage.debug = 'none'; //turns on socket data logging into console

//redirects to login if user is not authenticated
const PrivateRoute = ({ component: Component, ...rest }) => (
    <Route {...rest} render={props => (
        localStorage.getItem('sessionToken')
            ? <Component {...props} />
            : <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
    )} />
)




function App() {


  return (
      <SocketContext.Provider value={socket}>
          <GameProvider>
              <div className="App">
                      <Router>
                          <Route path="/" component={NavBar}/>
                          <Switch>
                              <PrivateRoute path="/" exact component={MainPageScreen} />
                              <PrivateRoute path="/play" component={PlayGameScreen} />
                              <Route path="/login" component={LogRegScreen} />
                              <Redirect from="*" to="/" />
                          </Switch>
                      </Router>
              </div>
          </GameProvider>
      </SocketContext.Provider>
  );
}

export default App;
