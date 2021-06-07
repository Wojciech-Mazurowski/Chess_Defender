import SocketClient from "../serverLogic/WebSocket";
import {createContext} from 'react';

export const socket = new SocketClient();
export const SocketContext = createContext(socket);



// const {Provider} = SocketContext
// //custom provider
// export const SocketProvider = ({children}) => {
//     const [socket, setSocket] = useState(new SocketClient())
//     const changeSocket = (socket) => setSocket(socket)
//     return (
//         <Provider value={{socket, changeSocket}}>
//             {children}
//         </Provider>
//     )
// }
//
// //custom hook
// export const useSocket = () => useContext(SocketContext)