// Create Redux action types
export const SET_GAMEID = 'SET_GAMEID'
export const SET_GAMEMODE = 'SET_GAME_MODE'
export const SET_PLAYINGAS = 'SET_PLAYINGAS'
export const SET_CURRENT_FEN= 'SET_CURRENT_FEN'

//SETTERS
export const setGameId = (gameId) => ({
    type: SET_GAMEID,
    payload: gameId,
})

export const setGameMode = (gameMode) => ({
    type: SET_GAMEMODE,
    payload: gameMode,
})
export const setPlayingAs = (playingAs) => ({
    type: SET_PLAYINGAS,
    payload: playingAs,
})
export const setCurrentFEN = (currentFEN) => ({
    type: SET_CURRENT_FEN,
    payload: currentFEN,
})


