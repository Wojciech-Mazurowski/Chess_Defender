// Create Redux action types
export const UPDATE_SOCKET = 'UPDATE_SOCKET'

//SETTERS
export const updateSocket = (socket) => ({
    type: UPDATE_SOCKET,
    payload: socket,
})



