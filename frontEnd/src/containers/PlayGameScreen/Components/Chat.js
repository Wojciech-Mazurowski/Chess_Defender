import SocketMessagingComponent from "../../CommonComponents/SocketMessagingComponent";
import "./Chat.css"
import Form from "react-bootstrap/Form";
import React from "react";
import Button from "react-bootstrap/Button";

class Chat extends SocketMessagingComponent{
    constructor(props) {
        super(props);
        this.state={
            messages:[],
            typedMsg:"",
            playerName:localStorage.getItem('username')
        }
        this.handleSubmit = this.handleSubmit.bind(this);
    }



    handleSubmit(event){
        event.preventDefault();
        console.log(this.state.playerName);
        let data= {
            name:this.state.playerName,
            text:this.state.typedMsg
        };
        let updatedMsgs= this.state.messages;
        updatedMsgs.push(data);
        //add msg and clear field
        this.setState({messages:updatedMsgs,typedMsg:""});


        //TODO send text login
        return;
    }

    render() {

        let messageList= this.state.messages.map((msg)=>{
            return (
                <div  className="Chat-messageItem">
                    <span className="Chat-messageItem-name">{msg.name}:&nbsp;</span>
                    <span>{msg.text}</span>
                </div>
            );
        });


        return (
            <section className="Chat">
                <div className="Chat-messages">
                    {messageList}
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

export default Chat;