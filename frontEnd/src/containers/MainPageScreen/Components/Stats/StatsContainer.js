import React from "react";
import WinChart from "./WinChart"
import EloChart from "./EloChart";
import "./StatsContainer.css"
import SectionTitle from "../../../CommonComponents/SectionTitle";


export default function MainPageScreen() {

    return (
        <section id="STATS" className="StatsContainer">
            <div className="title_area">
                <SectionTitle title="YOUR STATS"/>
            </div>
            <div className="text_area">
                <p>Games Played: </p>
                <p>Current ELO: </p>
                <p>Rank deviation?: </p>
            </div>
            <div className="chart_are">
                <WinChart className="chart_area"/>
            </div>

        </section>
    );
}