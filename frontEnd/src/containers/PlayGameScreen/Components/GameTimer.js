import "./GameTimer.css"
import React, {Component, useEffect, useState} from "react";
import {connect} from "react-redux";
import {mapAllStateToProps} from "../../../redux/reducers/rootReducer";
import useTimer from "../../CommonComponents/Timer";
import {formatTime, formatTimeMinutes} from "../../../serverLogic/Utils";


function GameTimer ({currentTurn,playerColor,blackTime,whiteTime}){
    const {timer,handlePause,handleResume,setTime} = useTimer(600,-1);

    //on intialization
    useEffect(() => {
        playerColor==='w'?  setTime(Math.floor(whiteTime)): setTime(Math.floor(blackTime))
    }, [blackTime,whiteTime]);

    //everytime turn changes
    useEffect(() => {
        if (currentTurn===playerColor){
            handleResume();
            return;
        }
        handlePause();
    }, [currentTurn]);




    return (
        <div className="GameTimer">
            {playerColor} {formatTimeMinutes(timer)}
        </div>
    );


}

const mapStateToProps = (state) => {
    return {
        currentTurn: state.game.currentTurn,
        whiteTime:state.game.whiteTime,
        blackTime:state.game.blackTime
    };
};
export default connect(mapStateToProps)(GameTimer);