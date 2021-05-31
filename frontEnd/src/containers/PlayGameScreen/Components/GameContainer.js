import TCPMessagingComponent from "../../CommonComponents/TCPMessagingComponent";
import "./GameContainer.css"


export default class GameContainer extends TCPMessagingComponent{
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <section className="GameContainer">
                <button onClick={()=>this.sendMessage("HALO 123")}/>
                {this.props.children}
            </section>
        );
    }

}