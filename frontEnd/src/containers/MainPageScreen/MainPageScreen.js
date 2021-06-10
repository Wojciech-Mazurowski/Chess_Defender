import React, {useState} from "react";
import FindGameWidget from "./Components/FindGameWidget";
import MatchHistory from "./Components/MatchHistory/MatchHistory";
import Section from "../CommonComponents/Section";
import StatsContainer from "./Components/Stats/StatsContainer"
import {getIsInGame} from "../../serverLogic/DataFetcher"
import {connect} from "react-redux";
import {mapAllStateToProps} from "../../redux/reducers/rootReducer";

function MainPageScreen({userId,sessionToken,}) {
    return (
        <div>
            <FindGameWidget/>
            <Section section="STATS">
                <StatsContainer/>
                <MatchHistory/>
            </Section>

        </div>
    );
}

export default connect(mapAllStateToProps)(MainPageScreen)