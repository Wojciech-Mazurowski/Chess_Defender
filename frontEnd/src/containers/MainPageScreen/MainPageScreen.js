import React from "react";
import {useHistory} from "react-router-dom";
import FindGameWidget from "./Components/FindGameWidget";
import MatchHistory from "./Components/MatchHistory/MatchHistory";
import Section from "../CommonComponents/Section";

export default function MainPageScreen() {


    return (
        <div>
            <FindGameWidget/>
            <Section section="STATS">
                <MatchHistory/>
            </Section>

        </div>
    );
}