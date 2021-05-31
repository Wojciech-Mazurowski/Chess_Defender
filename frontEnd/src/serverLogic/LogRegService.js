import {sha256} from "js-sha256";
import React from "react";
import {API_URL} from "./APIConfig";
import {handleResponse, fetchWithTimeout, FETCH_DEBUGGING_MODE, authHeader} from "./DataFetcher"

export async function login(username,password){

    try {
        let hashedPassword=sha256(password);
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, hashedPassword })
        };

        const response = await fetchWithTimeout(API_URL + '/login', requestOptions);
        const respObj = await handleResponse(response);

        //save user data locally for later authentication
        localStorage.setItem('username', respObj.username);
        localStorage.setItem('userId', respObj.userId);
        localStorage.setItem('sessionToken', respObj.sessionID);

        if (FETCH_DEBUGGING_MODE)  console.log(respObj);
        return respObj;
    } catch (error) {
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

export async function logout(){
    //handle player not having been logedin in the first place
    if(!localStorage.getItem('sessionToken') ){
        window.location.reload(true); //reload to reroute to loginpage
        return;
    }
    let userId=localStorage.getItem('userId');

    try {
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: authHeader(),
            body: JSON.stringify({userId})
        };

        const response = await fetchWithTimeout(API_URL + '/logout', requestOptions);
        const respObj = await handleResponse(response);
        if (FETCH_DEBUGGING_MODE)  console.log(respObj);

    } catch (error) {
        console.log(error.name === 'AbortError');
        //remove userInfo from local storage
    }
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');

    window.location.reload(true); //reload to reroute to loginpage
    return;

}





