import {combineReducers} from 'redux'
import "./userReducer"
import userInfoReducer from "./userReducer";
import gameInfoReducer from "./gameReducer"
import socketReducer from "./socketReducer"

//all reducers combined
const rootReducer = combineReducers({
    user: userInfoReducer,
    game: gameInfoReducer,
    socket:socketReducer,
})


export default rootReducer;




// Map Redux state to React component props
export const mapAllStateToProps = (state) => {
    return {
        sessionToken: state.user.sessionToken,
        userId: state.user.userId,
        username: state.user.username,
        elo: state.user.elo,
        isInGame: state.user.isInGame,
        socket: state.socket.socket,
        gameId: state.game.gameId,
        gameMode: state.game.gameMode,
        playingAs: state.game.playingAs,
        currentFEN: state.game.currentFEN
    };
};
