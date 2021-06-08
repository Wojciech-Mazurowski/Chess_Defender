import SocketMessagingComponent from "../../CommonComponents/SocketMessagingComponent";
import "./Chat.css"
import Form from "react-bootstrap/Form";
import React from "react";
import Button from "react-bootstrap/Button";
import {withMyHooks} from "../../../context/gameContext";

class Chat extends SocketMessagingComponent{
    constructor(props) {
        super(props);
        this.socket = this.props.socketContext;
        this.playerName=localStorage.getItem('username');
        this.playerId = localStorage.getItem('userId');
        this.gameId= this.props.gameContext.gameId;

        let selfMessageStyle={
            color:'var(--sec-color)'
        }
        let opponentMessageStyle={
            color:'var(--primary-color)'
        }
        this.messageStyles= [selfMessageStyle,opponentMessageStyle]

        this.state={
            messages:[],
            typedMsg:"",
        }
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        this.socket.on('receive_message',(data)=>{
            if (this.socket === undefined || !this.socket.is_connected || data===undefined)  return;

            console.log(data)
            let msg= {
                name:data.playerName,
                text:data.text,
                sender:1
            };
            this.addMessageToLog(msg);
        })
    }
    scrollToBottom = () => {
        this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    }
    
    addMessageToLog(msg){
        let updatedMsgs= this.state.messages;
        updatedMsgs.push(msg);
        //add msg and clear field
        this.setState({messages:updatedMsgs})

        //scroll to div to bottom to show new msg
        this.scrollToBottom()
    }

    handleSubmit(event){
        event.preventDefault();
        let playerName=this.playerName;
        let text=this.state.typedMsg;
        let gameId=this.gameId
        let playerId=this.playerId;
        let msg= {
            name:playerName,
            text:text,
            sender:0
        };
        this.addMessageToLog(msg)
        //clear msg field
        this.setState({typedMsg:""});

        //send to server
        this.socket.emit('send_chat_to_server',JSON.stringify({playerName,text,gameId,playerId}));
    }

    render() {

        let messageList= this.state.messages.map((msg)=>{
            return (
                <div  className="Chat-messageItem">
                    <span style={this.messageStyles[msg.sender]} className="Chat-messageItem-name">{msg.name}:&nbsp;</span>
                    <span>{msg.text}</span>
                </div>
            );
        });


        return (
            <section className="Chat">
                <div id="Chat-messages" className="Chat-messages">
                    {messageList}
                    <div style={{ float:"left", clear: "both", height:'0.5rem' }}
                         ref={(el) => { this.messagesEnd = el; }}>
                    </div>
                </div>
                <Form onSubmit={this.handleSubmit}>
                    <div  className="Chat-input">
                        <Form.Control
                            required
                            placeholder="Your message...."
                            type="text"
                            value={this.state.typedMsg}
                            onChange={(e) => this.setState({typedMsg:e.target.value})}
                        />
                    </div>
                </Form>
            </section>
        );
    }

}

export default withMyHooks(Chat);