// Import all actions
import * as actions from '../actions/gameActions'
import {SocketStatus} from "../../serverLogic/WebSocket";


export const gameInitialState = {
    gameId: sessionStorage.getItem('gameId'),
    gameMode: sessionStorage.getItem('gameMode'),
    playingAs: sessionStorage.getItem('playingAs'),
    currentFEN: sessionStorage.getItem('currentFEN'),
    opponentUsername:sessionStorage.getItem('opponentUsername'),
    opponentElo: sessionStorage.getItem('opponentElo'),
    chatHistory:sessionStorage.getItem('chatHistory'),
    opponentsStatus: SocketStatus.connected //opponent presumed connected until notified otherwise
};

export default function gameInfoReducer(state = gameInitialState, action) {
    switch (action.type){
        case actions.SET_PLAYINGAS:
            sessionStorage.setItem('playingAS',action.payload)
            return {...state, playingAs:action.payload}
        case actions.SET_GAMEID:
            sessionStorage.setItem('gameId',action.payload)
            return {...state, gameId:action.payload}
        case actions.SET_GAMEMODE:
            sessionStorage.setItem('gameMode',action.payload)
            return {...state, gameMode:action.payload}
        case actions.SET_CURRENT_FEN:
            sessionStorage.setItem('currentFEN',action.payload)
            return {...state, currentFEN:action.payload}
        case actions.SET_OPPONENT_USERNAME:
            sessionStorage.setItem('opponentUsername',action.payload)
            return {...state, opponentUsername:action.payload}
        case actions.SET_OPPONENT_ELO:
            sessionStorage.setItem('opponentELO',action.payload)
            return {...state, opponentElo:action.payload}
        case actions.SET_OPPONENT_STATUS:
            sessionStorage.setItem('opponentsStatus',action.payload)
            return {...state, opponentsStatus:action.payload}
        default:
            return state
    }
}
