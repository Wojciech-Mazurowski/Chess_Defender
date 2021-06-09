// Import all actions
import * as actions from '../actions/gameActions'


export const gameInitialState = {
    gameId: sessionStorage.getItem('gameId'),
    gameMode: sessionStorage.getItem('gameMode'),
    playingAs: sessionStorage.getItem('playingAs'),
    currentFEN: sessionStorage.getItem('currentFEN'),
    oponentUsername:sessionStorage.getItem('oponentUsername'),
    opponentElo: sessionStorage.getItem('opponentElo'),
    chatHistory:sessionStorage.getItem('chatHistory')
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
        default:
            return state
    }
}
