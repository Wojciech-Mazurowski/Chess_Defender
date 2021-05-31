import React, { useState, useEffect } from "react";
import socketIOClient from "socket.io-client";
const ENDPOINT = "http://127.0.0.1:5010";

export default function SocketIOClient() {
    const [response, setResponse] = useState("");

    useEffect(() => {
        const socket = socketIOClient(ENDPOINT);
        localStorage.debug = '*';

        socket.on("FromAPI", data => {
            setResponse(data);
        });
    }, []);

    return (
        <p>
            It's <time dateTime={response}>{response}</time>
        </p>
    );
}