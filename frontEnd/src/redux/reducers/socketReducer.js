// Import all actions
import * as actions from '../actions/socketActions'
import SocketClient from "../../serverLogic/WebSocket";

export const socketInitialState = {
    socket: new SocketClient(),
};

export default function socketReducer(state = socketInitialState, action) {
    switch (action.type){
        case actions.UPDATE_SOCKET:
            return {...state, socket:action.payload}
        default:
            return state
    }
}
