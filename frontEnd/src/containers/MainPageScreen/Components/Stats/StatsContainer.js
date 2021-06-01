import React, {useEffect, useState} from "react";
import "./StatsContainer.css"
import SectionTitle from "../../../CommonComponents/SectionTitle";
import Dots from "../../../CommonComponents/Dots";
import {FETCH_DEBUGGING_MODE, getMatchHistory, getPlayerStats} from "../../../../serverLogic/DataFetcher";



export default function StatsContainer() {
    const [currentElo, setCurrentElo] = useState("loading");
    const [rankDeviation, setRankDeviation] = useState("loading");
    const [gamesPlayed, setGamesPlayed] = useState("loading");
    const [gamesWon, setGamesWon] = useState("loading");
    const [gamesLost, setGamesLost] = useState("loading");
    const [draws, setDraws] = useState("loading");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPlayerData();
    }, []);


    async function fetchPlayerData() {
        const userId = localStorage.getItem('userId');
        const resp = await getPlayerStats(userId);
        if(FETCH_DEBUGGING_MODE) console.log(resp);

        setIsLoading(false);
        //handle network errors
        if (resp === undefined || resp.error !== undefined) {
            //show some error messagae
            setCurrentElo("Can't connect :(");
            setRankDeviation("");
            setGamesPlayed("");
            setGamesWon("");
            setGamesLost("");
            setDraws("");
            return;
        }

        await setCurrentElo(resp.elo);
        await setRankDeviation(resp.deviation);
        await setGamesPlayed(resp.gamesPlayed);
        await setGamesWon(resp.gamesWon);
        await setGamesLost(resp.gamesLost);
        await setDraws(resp.draws);
    }

    return (
        <section id="STATS" className="StatsContainer">
            <div className="title_area">
                <SectionTitle title="YOUR STATS"/>
            </div>
            <div className="text_area">
                <div className="elo-stats">
                    <h1>Current ELO:
                        <span className="prim-text">
                         &nbsp;{currentElo} {isLoading && <Dots/>}
                        </span>
                    </h1>
                    <p>Rank deviation:
                        <span className="dark-prim-text">
                            &nbsp;{rankDeviation} {isLoading && <Dots/>}
                        </span>
                    </p>
                </div>

                <div className="game-stats">
                    <h1>Games Played: <span>&nbsp;{gamesPlayed} {isLoading && <Dots/>} </span></h1>
                    <p>Games Won: <span className="succ-text">&nbsp;{gamesWon} {isLoading && <Dots/>} </span></p>
                    <p>Games Lost: <span className="fail-text">&nbsp;{gamesLost} {isLoading && <Dots/>} </span></p>
                    <p>Draws: <span className="neutral-text">&nbsp;{draws} {isLoading && <Dots/>}</span></p>
                </div>


            </div>
            <div className="chart_are">
                <div className="ChartPlaceholder"/>
                <div className="ChartPlaceholder2"/>

            </div>

        </section>
    );
}