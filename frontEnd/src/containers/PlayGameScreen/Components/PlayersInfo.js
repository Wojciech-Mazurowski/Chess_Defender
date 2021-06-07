import SocketMessagingComponent from "../../CommonComponents/SocketMessagingComponent";
import "./PlayersInfo.css"
import {PlayerInfo} from "../../MainPageScreen/Components/MatchHistory/MatchHistoryItem";
import {SocketStatus} from "../../../serverLogic/WebSocket";
import React from "react";

class PlayersInfo extends SocketMessagingComponent{
    constructor(props) {
        super(props);
        this.state ={
            whiteInfo: new PlayerInfo("Loading","WHITE","Loading"),
            blackInfo: new PlayerInfo("Loading","WHITE","Loading"),
            whiteStatus: SocketStatus.connecting,
            blackStatus: SocketStatus.connecting
        }
    }

    render() {
        return (
            <section className="PlayersInfo">
                <div className="PlayersInfo-playerContainer">
                    <div className="PlayersInfo-status" style={{'background-color':this.state.whiteStatus.color}}/>
                    <div className="MatchHistoryItem-player">
                        <h1>{this.state.whiteInfo.username}</h1>
                        <h2>{this.state.whiteInfo.playedAs} | {this.state.whiteInfo.ELO} ELO</h2>
                    </div>
                </div>

                <div className="PlayersInfo-playerContainer">
                    <div className="PlayersInfo-status" style={{'background-color':this.state.blackStatus.color}}/>
                    <div className="MatchHistoryItem-player">
                        <h1>{this.state.blackInfo.username}</h1>
                        <h2>{this.state.blackInfo.playedAs} | {this.state.blackInfo.ELO} ELO</h2>
                    </div>
                </div>

            </section>
        );
    }

}

export default PlayersInfo;