import './App.css';
import LogRegScreen from "./containers/LogRegScreen/LogRegScreen";
import MainPageScreen from "./containers/MainPageScreen/MainPageScreen";
import PlayGameScreen from "./containers/PlayGameScreen/PlayGameScreen";
import NavBar from "./containers/Navigation/NavBar";
import {BrowserRouter as Router, Switch, Route, Redirect} from 'react-router-dom';
import {SocketContext,socket} from './context/socketContext';
import {GameProvider} from './context/gameContext';


localStorage.debug = 'none'; //turns on socket data logging into console
socket.connect();

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
          <GameProvider>
              <SocketContext.Provider value={socket}>
                  <div className="App">
                      <Router>
                          <Route path="/" component={NavBar}/>
                          <Switch>
                              <Route path="/" exact component={PlayGameScreen} />
                              <Route path="/play" component={PlayGameScreen} />
                              <Route path="/login" component={LogRegScreen} />
                              <Redirect from="*" to="/" />
                          </Switch>
                      </Router>
                  </div>
              </SocketContext.Provider>
          </GameProvider>
  );
}

export default App;
