import {sha256} from "js-sha256";
import {API_URL} from "./APIConfig";
import {handleResponse, fetchWithTimeout, FETCH_DEBUGGING_MODE, authHeader} from "./DataFetcher"
import {setCookie} from "./Utils";

export async function login(username,password){

    try {
        let hashedPassword=sha256(password);
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, hashedPassword })
        };

        const response = await fetchWithTimeout(API_URL + '/login', requestOptions);
        const respObj = await handleResponse(response);

        if (FETCH_DEBUGGING_MODE)  console.log(respObj);
        return respObj;
    } catch (error) {
        console.log(error);
        console.log(error.name === 'AbortError');
        return {error: 'Network connection error'};
    }
}

export async function register(username,password){
    try {
        let hashedPassword=sha256(password);
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username,hashedPassword})
        };

        const response = await fetchWithTimeout(API_URL + '/register', requestOptions);
        const respObj = await handleResponse(response);
        if (FETCH_DEBUGGING_MODE)  console.log(respObj);
        return respObj;
    } catch (error) {
        console.log(error.name === 'AbortError');
        return {error: 'Network connection error'};
    }
}

export async function logout(sessionToken){

    //TODO logout
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('elo');

    // if(!sessionToken || !userId){
    //     //window.location.reload(true); //reload to reroute to loginpage
    //     return;
    // }

    // try {
    //     const requestOptions = {
    //         method: 'POST',
    //         mode: 'cors',
    //         headers: authHeader(sessionToken),
    //         body: JSON.stringify({userId})
    //     };
    //
    //     const response = await fetchWithTimeout(API_URL + '/logout', requestOptions);
    //     const respObj = await handleResponse(response);
    //     if (FETCH_DEBUGGING_MODE)  console.log(respObj);
    //
    // } catch (error) {
    //     console.log(error.name === 'AbortError');
    // }

    //window.location.reload(true); //reload to reroute to loginpage
}





