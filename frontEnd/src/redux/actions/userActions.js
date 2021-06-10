// Create Redux action types
export const SET_USERID = 'SET_USERID'
export const SET_USERNAME = 'SET_USERNAME'
export const SET_USERELO = 'SET_USERELO'
export const SET_SESSION_TOKEN= 'SET_SESSION_TOKEN'

//SETTERS
export const setUserId = (userId) => ({
    type: SET_USERID,
    payload: userId,
})

export const setUsername = (username) => ({
    type: SET_USERNAME,
    payload: username,
})

export const setUserElo = (elo) => ({
    type: SET_USERELO,
    payload: elo,
})

export const setSessionToken = (sessionToken) => ({
    type: SET_SESSION_TOKEN,
    payload: sessionToken,
})


