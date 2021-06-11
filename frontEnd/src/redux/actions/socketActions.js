// Create Redux action types
export const UPDATE_SOCKET = 'UPDATE_SOCKET'
export const SET_SOCKET_STATUS = 'SET_SOCKET_STATUS'
export const EMIT= 'EMIT'

//SETTERS
export const updateSocket = (socket) => ({
    type: UPDATE_SOCKET,
    payload: socket,
})

export const setSocketStatus = (socketStatus) => ({
    type: SET_SOCKET_STATUS,
    payload: socketStatus,
})

export const emit = (eventAndmsg) => ({
    type: EMIT,
    payload: eventAndmsg,
})



