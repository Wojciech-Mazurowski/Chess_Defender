import TCPMessagingComponent from "../../CommonComponents/TCPMessagingComponent";
import "./GameContainer.css"


export default class GameContainer extends TCPMessagingComponent{
    constructor(props) {
        super(props);
        this.style=props.style;
    }

    render() {
        return (
            <section style={this.style} className="GameContainer">
                {this.props.children}
            </section>
        );
    }

}