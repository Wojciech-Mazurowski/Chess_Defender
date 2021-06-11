import "./GameButtons.css"
import {Component} from "react";
import {connect} from "react-redux";
import {emit} from "../../../redux/actions/socketActions";

class GameButtons extends Component{
    // constructor(props) {
    //     super(props);
    //
    // }

    surrenderGame = () =>{
        let evntAndMsg ={
            event:'surrender',
            msg: JSON.stringify({
                'gameroomId':this.props.gameId,
                'playerId':this.props.userId,
            })
        }

        this.props.dispatch(emit(evntAndMsg));
    }

    render() {
        return (
            <section className="GameButtons">
                <button onClick={this.surrenderGame}>SURRENDER GAME</button>
            </section>
        );
    }

}
const mapStateToProps = (state) => {
    return {
        userId: state.user.userId,
        gameId: state.game.gameId
    };
};
export default connect(mapStateToProps)(GameButtons);