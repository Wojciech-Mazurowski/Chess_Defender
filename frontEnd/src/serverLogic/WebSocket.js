import io from 'socket.io-client';
import {API_URL} from "./APIConfig";


const socketPath = '';

export default class SocketClient {
    socket;
    is_connected=false;

    constructor() {
    }

    is_connected(){
        return this.is_connected;
    }

    connect() {
        this.socket = io.connect(API_URL, { path: socketPath });
        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                this.is_connected=true;
                resolve();
            });
            this.socket.on('connect_error', (error) => reject(error));
        });
    }

    disconnect() {
        return new Promise((resolve) => {
            this.socket.disconnect(() => {
                this.socket = null;
                resolve();
            });
        });
    }

    emit(event, data) {
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

    //custom event handler, executes given function on event
    on(event, fun) {
        return new Promise((resolve, reject) => {
            if (!this.socket) return reject('No socket connection.');

            this.socket.on(event, fun);
            resolve();
        });
    }
}



// export default class WebSocketClient {
//
//     constructor() {
//         this.url="ws://127.0.0.1:5010";
//         this.messageQ = [];
//         this.sendBuffer = [];
//         this.timeout=250;
//         this.ws=null;
//     }
//
//     send(data){
//         this.ws.send(data);
//     }
//
//     //returns false if there are  no elements in queue, otherwise returns the element
//     popMessage(){
//         let topElement=this.messageQ.shift();
//         return topElement===undefined ? false : topElement;
//     }
//
//     //establishes the connect with the websocket and also ensures constant reconnection if connection closes
//     connect = () => {
//         this.ws=new WebSocket(this.url);
//         let that = this;
//         let connectInterval;
//
//         // websocket onopen event listener
//         this.ws.onopen = () => {
//             console.log("connected websocket!");
//             this.send("TEST123");
//             that.timeout = 500; // reset timer to 250 on open of websocket connection
//             clearTimeout(connectInterval); // clear Interval on on open of websocket connection
//         };
//
//         //add received messages to message list
//         this.ws.onmessage = message => {
//             console.log("received a message: ");
//             console.log(message);
//             this.messageQ.push(message);
//         }
//
//         this.ws.onclose = e => {
//             console.log(
//                 `Socket is closed. Reconnect will be attempted in ${Math.min(
//                     10000 / 1000,
//                     (that.timeout + that.timeout) / 1000
//                 )} second.`,
//                 e.reason
//             );
//
//             that.timeout = that.timeout + that.timeout; //increment retry interval
//             connectInterval = setTimeout(this.check, Math.min(10000, that.timeout)); //call check function after timeout
//         };
//
//         // websocket onerror event listener
//         this.ws.onerror = err => {
//             console.error("Socket encountered error: ", err.message, "Closing socket");
//             this.ws.close();
//         };
//     };
//
//     //connect to check if the connection is closed, if so attempts to reconnect
//     check = () => {
//         //check if websocket instance is closed, if so call `connect` function.
//         if (!this.ws || this.ws.readyState == WebSocket.CLOSED) this.connect();
//     };
// }
//
