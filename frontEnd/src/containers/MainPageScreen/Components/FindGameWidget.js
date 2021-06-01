import React, {useContext, useEffect, useState} from "react";
import "./FindGameWidget.css"
import TextWithWavyOrnament from "../../CommonComponents/TextWithWavyOrnament";
import {formatTime} from "../../../serverLogic/Utils"
import useTimer from "../../CommonComponents/Timer";
import Dots from "../../CommonComponents/Dots"
import {useHistory} from "react-router-dom";
import {useGame} from "../../../context/gameContext";
import {SocketContext} from "../../../context/socketContext";


export default function FindGameWidget() {

    const playerId = localStorage.getItem('userId');
    const [playersInQ, setPlayersInQ] = useState("loading...");
    const buttonTexts = ["FIND A GAME!", "IN QUEUE"];

    const [isInQ, setIsInQ] = useState(false);
    const [buttonText, setButtonText] = useState(buttonTexts[0]);
    const [scope, setScope] = useState(50);
    const {timer, timerRestart} = useTimer(0);

    //routing after having succesfully found a game
    const history = useHistory();
    const routeToNext = (gameId) => history.push('/play?id=' +gameId );

    //socketIO Client
    const socket = useContext(SocketContext);
    const game = useGame();


    const idleStyle = {
        background: 'linear-gradient(90deg, rgba(200,199,199,1) 30%, rgba(254,254,254,1) 100%)',
        color: '#1c534b'
    }

    const inQStyle = {
        background: 'rgba(218,139,67,1)',
        color: '#e8ece8'
    }
    const QInfoStyle = {
        color: '#69aca1'
    };

    function findGame() {
        let prevIsInQ = isInQ;

        setIsInQ(!isInQ);
        setButtonText(buttonTexts[isInQ ? 0 : 1]);
        //restart the timer
        timerRestart();

        //using prevIsInQ because setstate takes a while to update
        !prevIsInQ ? joinQ() : leaveQ();
    }


    socket.on("queue_info", data => {
        console.log("queue_data" + data);
        setPlayersInQ(data.playersInQueue);
    });

    socket.on("update_scope", data => {
        console.log("scope_update " + data);
        setScope(data.scope);
    });

    socket.on("game_found", data => {
        //join game
        console.log("game_found");
        console.log(data);
        game.changePlayingAs(data.playingAs);
        game.changeGameId(data.gameId);
        routeToNext(data.gameId)
    });


    async function joinQ() {
        //check for socket connection, if none exists, connect
        if (!socket.is_connected) return;
        await socket.emit("join_queue", playerId);
    }

    async function leaveQ() {
        if (!socket.is_connected) return;
        await socket.emit("leave_queue", playerId);
    }


    return (
        <section id="PLAY" className="PlayGameWidget">
            <button
                style={isInQ ? inQStyle : idleStyle}
                onClick={findGame}
            >
                <TextWithWavyOrnament fontSize='2.5rem'>
                    {buttonText}
                    {isInQ && <Dots/>}
                </TextWithWavyOrnament>

            </button>

            {isInQ &&
            <ul className="QInfo">
                <li><span style={QInfoStyle}>Wait time:</span> {formatTime(timer)}</li>
                <li><span style={QInfoStyle}>Players in queue:</span> {playersInQ}</li>
                <li><span style={QInfoStyle}>Scope:</span> +-{scope}</li>
            </ul>}


        </section>

    );
}
