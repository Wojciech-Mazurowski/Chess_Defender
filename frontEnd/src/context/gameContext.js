import React, {useContext,createContext, useState} from 'react';
import {SocketContext} from "./socketContext";

export const gameContext = createContext()

const {Provider} = gameContext
//custom provider
export const GameProvider = ({children}) => {
    const [playingAs, setPlayingAs] = useState('w')
    const changePlayingAs = (color) => setPlayingAs(color)
    return (
        <Provider value={{playingAs, changePlayingAs}}>
            {children}
        </Provider>
    )
}

//custom hook
export const useGame = () => useContext(gameContext)

export function withMyHooks(Component) {
    return function WrappedComponent(props) {
        const gameContext = useGame();
        const socketContext=useContext(SocketContext);
        return <Component {...props} gameContext={gameContext} socketContext={socketContext} />;
    }
}



const statusContext = React.createContext()


