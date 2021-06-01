import {Component} from "react";
import "./MatchHistory.css"
import "../../../CommonComponents/SectionTitle";
import SectionTitle from "../../../CommonComponents/SectionTitle";
import MatchHistoryItem, {MatchResult, MatchDate, MatchItemInfo, PlayerInfo} from "./MatchHistoryItem"
import "./MatchHistoryItem";
import VariableColor from "../../../CommonComponents/VariableColor";
import {getMatchHistory} from "../../../../serverLogic/DataFetcher"
import {FETCH_DEBUGGING_MODE} from "../../../../serverLogic/DataFetcher"


class MatchHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            matchHistory: []
        }
    }

    componentDidMount() {
        this.fetchPlayerData();
    }

    async fetchPlayerData() {
        const userId = localStorage.getItem('userId');
        const resp = await getMatchHistory(userId);
        if(FETCH_DEBUGGING_MODE) console.log(resp);

        this.setState({isLoading: false})
        //handle network errors
        if (resp === undefined || resp.error !== undefined) {
            this.setState({matchHistory: this.getEmptyMatchHistoryItem()});
            //show some error messagae
            return;
        }

        //handle empty match history
        if(resp.length ===0){
            this.setState({matchHistory: this.getEmptyMatchHistoryItem()});
            return;
        }

        let matchHistoryArray= resp.map(
            item => {
                let result = MatchResult.getResultFromString(item.matchResult);
                let p1Info = new PlayerInfo(item.p1Username, item.p1PlayedAs, item.p1ELO);
                let p2Info = new PlayerInfo(item.p2Username, item.p2PlayedAs, item.p2ELO);
                let date = new MatchDate(item.hour, item.dayMonthYear);
                let matchItemInfo = new MatchItemInfo(result, item.nOfMoves, p1Info, p2Info, date);
                return <MatchHistoryItem matchItemInfo={matchItemInfo}/>;
            })
        this.setState({matchHistory: matchHistoryArray})
    }

    getEmptyMatchHistoryItem(){
        let p1Info = new PlayerInfo("----", "WHITE", "----");
        let p2Info = new PlayerInfo("----", "BLACK", "----");
        let date = new MatchDate("--:--", "--/--/--");
        let matchItemInfo = new MatchItemInfo(MatchResult.none, "00", p1Info, p2Info, date);
        console.log(matchItemInfo);
        return <MatchHistoryItem matchItemInfo={matchItemInfo}/>;
    }

    render() {
        return (
            <section className="MatchHistory">
                <SectionTitle title="MATCH HISTORY"/>

                <div className="MatchHistory-colors">
                    <VariableColor
                        color={MatchResult.win.color}
                        text={MatchResult.win.name}/>
                    <VariableColor
                        color={MatchResult.loss.color}
                        text={MatchResult.loss.name}/>
                    <VariableColor
                        color={MatchResult.draw.color}
                        text={MatchResult.draw.name}/>
                </div>
                {this.state.isLoading && <MatchHistoryPlaceholder/>}
                <div className="MatchHistory-container">
                    {this.state.matchHistory}
                </div>
            </section>
        );
    }

}

class MatchHistoryPlaceholder extends Component {
    render() {
        return (
            <div className="MatchHistory-placeholder"></div>
        );
    }
}

export default MatchHistory;