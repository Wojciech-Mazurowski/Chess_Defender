import React from "react";
import FindGameWidget from "./Components/FindGameWidget";
import MatchHistory from "./Components/MatchHistory/MatchHistory";
import Section from "../CommonComponents/Section";
import StatsContainer from "./Components/Stats/StatsContainer"
import {connect} from "react-redux";
import {mapAllStateToProps} from "../../redux/reducers/rootReducer";
import RejoinGameWidget from "./Components/MatchHistory/RejoinGameWidget";

function MainPageScreen() {

    return (
        <div>
            <RejoinGameWidget/>
            <FindGameWidget/>
            <Section section="STATS">
                <StatsContainer/>
                <MatchHistory/>
            </Section>
        </div>
    );
}

export default MainPageScreen

