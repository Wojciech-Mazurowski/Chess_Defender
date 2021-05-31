import {Component} from "react";
import WebSocketClient from "../../serverLogic/WebSocket";

class TCPMessagingComponent extends Component {
    constructor(props) {
        super(props);
        // this.websocket = new WebSocketClient();
        // this.websocket.connect();
    }

    // sendMessage(data){
    //     // websocket instance passed as props to the child component.
    //     try {
    //         this.websocket.send(data) //send data to the server
    //         console.log('SENT: '+data)
    //     } catch (error) {
    //         console.log(error) // catch error
    //     }
    // }
    //
    // //returns false if there are  no elements in queue, otherwise returns the element
    // popMessage(){
    //     return this.websocket.popMessage();
    // }

}




export default TCPMessagingComponent;
