import React from "react";
import {useHistory} from "react-router-dom";
import FindGameWidget from "./Components/FindGameWidget";
import MatchHistory from "./Components/MatchHistory/MatchHistory";
import Section from "../CommonComponents/Section";
import StatsContainer from "./Components/Stats/StatsContainer"

export default function MainPageScreen() {


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