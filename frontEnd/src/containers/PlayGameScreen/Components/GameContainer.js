import SocketMessagingComponent from "../../CommonComponents/SocketMessagingComponent";
import "./GameContainer.css"


export default class GameContainer extends SocketMessagingComponent{
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