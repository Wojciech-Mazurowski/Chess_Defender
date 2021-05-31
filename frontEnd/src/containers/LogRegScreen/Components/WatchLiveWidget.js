import React, {useState} from "react";
import "./WatchLiveWidget.css";
import ornament from '../../../assets/wavy-ornament.png';
import placeholder from '../../../assets/livePlaceholder.png';
import TextWithWavyOrnament from "../../CommonComponents/TextWithWavyOrnament";

export default function WatchLiveWidget() {
    const [player1,] = useState("Gukesh_D");
    const [player2,] = useState("GGKasparow");


    return (
        <div className="WatchLiveWidget">
            <TextWithWavyOrnament text="WATCH NOW" fontSize='1.5rem' ornamentSize="80%" direction="ltr" color="#69aca2"/>
            <img className="LivePreview" src={placeholder}/>
            <h2>{player1} <span className="vs">vs</span> {player2}</h2>
        </div>
    );


}