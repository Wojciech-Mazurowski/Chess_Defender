import io from 'socket.io-client';
import {API_URL} from "./APIConfig";
import {make_opponents_move} from "../containers/PlayGameScreen/Game/moves";
import {getSessionToken} from "./DataFetcher";
import {store} from "../index";
import {setSessionToken} from "../redux/actions/userActions";

const socketPath = '';

export class SocketStatus {
    static connecting = new SocketStatus('connecting', '#468f84');
    static connected = new SocketStatus('connected', '#369257');
    static disconnected = new SocketStatus('dissconnected', '#bf3d3b');

    constructor(name, color) {
        this.name = name;
        this.color = color;
    }

    toString() {
        return this.name;
    }
}

export default class SocketClient {

    constructor() {
        this.timeout = 250;
        this.socket = null;
        this.is_connected = false;
        this.is_authorized = false;
        this.ping = 1000;
        this.status = SocketStatus.disconnected;
    }


    disconnect() {
        return new Promise((resolve) => {
            this.socket.disconnect(() => {
                this.is_authorized = false;
                this.is_connected = false;
                this.socket = null;
                resolve();
            });
        });
    }

    emit(event, data) {
        if (!this.is_authorized) this.authorize();

        return new Promise((resolve, reject) => {
            if (!this.socket) return reject('No socket connection.');
            return this.socket.emit(event, data, (response) => {
                if (response && response.error) {
                    console.error(response.error);
                    return reject(response.error);
                }
                return resolve();
            });
        });
    }

    //authenticate client's socket
    async authorize() {
        if (!this.is_authorized) {
            const storeState=store.getState();
            let userId=storeState.user.userId;
            let sessionToken= storeState.user.sessionToken;

            //don't try to auth if user is yet to log in
            if(sessionToken==='none'|| userId===undefined) {
                return;
            }

            // if(sessionToken==='none'){
            //     sessionToken= await getSessionToken(userId);
            //     dispatch(setSessionToken(sessionToken));
            // }
            //if goes right do its, if not don't

            let authData = {
                userId: userId,
                sessionToken: sessionToken
            };

            this.socket.emit('authorize', authData);
        }
    }

    gameListeners() {
        this.on("make_move_local", data => {
            if (data === undefined) return;
            make_opponents_move(data.startingSquare, data.targetSquare, data.mtype);
        });
    }

    authListeners() {
        this.on('authorized', () => {
            this.is_authorized = true;
            this.status = SocketStatus.connected;
        });
        this.on('unauthorized', () => {
            this.is_authorized = false;
            //window.location.reload(true); //reload to reroute to loginpage
            this.status = SocketStatus.connecting;
        });
    }


    //custom event handler, executes given function on event
    on(event, fun) {
        return new Promise((resolve, reject) => {
            if (!this.socket) return reject('No socket connection.');
            this.socket.on(event, fun);
            resolve();
        });
    }

    //establishes the connect with the websocket and also ensures constant reconnection if connection closes
    connect = () => {
        this.socket = io.connect(API_URL, {path: socketPath});
        let that = this;
        let connectInterval;
        console.log("CHANGED TO CONNECTING");
        this.status = SocketStatus.connecting;

        this.authListeners();
        this.gameListeners();

        this.socket.on('connect', () => {
            console.log("connected websocket!");
            this.is_connected = true;
            that.timeout = 500; // reset timer to 250 on open of websocket connection
            clearTimeout(connectInterval); // clear Interval on on open of websocket connection
            this.authorize();
        });

        this.socket.on('connect_error', (reason) => {
            console.log(
                `Socket is closed. Reconnect will be attempted in ${Math.min(
                    10000 / 1000,
                    (that.timeout + that.timeout) / 1000
                )} second.`,
                reason
            );

            this.is_connected = false;
            this.is_authorized = false;
            this.status = SocketStatus.disconnected;
            that.timeout = that.timeout + that.timeout; //increment retry interval
            //call check function after timeout
            connectInterval = setTimeout(this.check, Math.min(10000, that.timeout));
        });


        this.socket.on('disconnect', (reason) => {
            console.log(
                `Socket is closed. Reconnect will be attempted in ${Math.min(
                    10000 / 1000,
                    (that.timeout + that.timeout) / 1000
                )} second.`,
                reason
            );
            this.is_connected = false
            this.is_authorized = false;
            this.status = SocketStatus.disconnected;
            that.timeout = that.timeout + that.timeout; //increment retry interval
            //call check function after timeout
            connectInterval = setTimeout(this.check, Math.min(10000, that.timeout));
        });

        //ping socket conitnously
    };

    //connect to check if the connection is closed, if so attempts to reconnect
    check = () => {
        //check if websocket instance is closed, if so call `connect` function.
        if (!this.socket || this.is_connected) this.connect();
    };
}
