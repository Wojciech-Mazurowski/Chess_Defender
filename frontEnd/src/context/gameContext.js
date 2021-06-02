import React, {useContext,createContext, useState} from 'react';
import {SocketContext} from "./socketContext";
import {useHistory} from "react-router-dom";

export const gameContext = createContext()

const {Provider} = gameContext
//custom provider
export const GameProvider = ({children}) => {
    const [playingAs, setPlayingAs] = useState('w')
    const [gameId, setGameId] = useState('UNKNOWN')
    const changePlayingAs = (color) => setPlayingAs(color)
    const changeGameId = (gameId) => setGameId(gameId)

    return (
        <Provider value={{playingAs,gameId, changePlayingAs,changeGameId}}>
            {children}
        </Provider>
    )
}

//custom hook
export const useGame = () => useContext(gameContext)


export function withMyHooks(Component) {
    return function WrappedComponent(props) {
        const gameContext = useGame();
        const socketContext= useContext(SocketContext);
        //routing after succesfull login
        const history = useHistory();
        const routeToMain= () => history.push('/');

        return <Component {...props} gameContext={gameContext} socketContext={socketContext} routeToMain={routeToMain}/>;
    }
}



const statusContext = React.createContext()


