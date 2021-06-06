import './App.css';
import LogRegScreen from "./containers/LogRegScreen/LogRegScreen";
import MainPageScreen from "./containers/MainPageScreen/MainPageScreen";
import PlayGameScreen from "./containers/PlayGameScreen/PlayGameScreen";
import NavBar from "./containers/Navigation/NavBar";
import {BrowserRouter as Router, Switch, Route, Redirect} from 'react-router-dom';
import {SocketContext,socket} from './context/socketContext';
import {GameProvider} from './context/gameContext';
import ScrollToTop from "./containers/CommonComponents/ScrollToTop";
import {make_opponents_move} from "./containers/PlayGameScreen/Game/moves";


socket.connect();
//TODO fix, this is trully terrible, i am so sorry
socket.on("make_move_local", data => {
    if (data === undefined) return;
    console.log("DOSTAEM");
    make_opponents_move(data.startingSquare, data.targetSquare, data.mtype);
});

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
                          <ScrollToTop />
                          <Route path="/" component={NavBar}/>
                          <Switch>
                              <PrivateRoute path="/" exact component={MainPageScreen} />
                              <PrivateRoute path="/play" component={PlayGameScreen} />
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
