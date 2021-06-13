import "./GameTimersWidget.css"
import React, {Component, useEffect, useState} from "react";
import {connect} from "react-redux";
import useTimer from "../../CommonComponents/Timer";
import GameTimer from "./GameTimer";


function GameTimersWidget({playingAs}) {
    const {timer, handlePause, handleResume, setTime} = useTimer(600, -1);
    const [whiteOrder, setWhiteOrder] = useState(-1)
    const [blackOrder, setBlackOrder] = useState(-1)

    //on intialization
    useEffect(() => {
        if (playingAs == 'w') {
            setWhiteOrder(1);
            setBlackOrder(0);
            return;
        }
        setWhiteOrder(0);
        setBlackOrder(1);
    }, [playingAs]);


    return (
        <div className="GameTimersWidget">
            <GameTimer style={{'order': whiteOrder}} playerColor='w'/>
            <GameTimer style={{'order': blackOrder}} playerColor='b'/>
        </div>
    );
}

const mapStateToProps = (state) => {
    return {
        playingAs: state.game.playingAs,
    };
};

export default connect(mapStateToProps)(GameTimersWidget);