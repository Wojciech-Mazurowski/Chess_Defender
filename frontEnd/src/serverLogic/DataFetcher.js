import {API_URL} from "./APIConfig";
import {logout} from "./LogRegService"

export const FETCH_DEBUGGING_MODE= true;

export async function getMatchHistory(userId) {

    try {
        const requestOptions = {
            method: 'GET',
            mode: 'cors',
            headers: authHeader(),
            timeout: 1000000
        };

        const response = await fetchWithTimeout(API_URL + '/match_history?userId=' + userId, requestOptions);
        const respObj = await handleResponse(response);
        if (FETCH_DEBUGGING_MODE) console.log(response);
        return respObj;
    } catch (error) {
        console.log(error.name === 'AbortError');
    }
}

export async function getIsInGame(userId) {
    try {
        const requestOptions = {
            method: 'GET',
            mode: 'cors',
            headers: authHeader(),
            timeout: 6000
        };

        const response = await fetchWithTimeout(API_URL + '/is_in_game?userId=' + userId, requestOptions);
        const respObj = await handleResponse(response);
        if (FETCH_DEBUGGING_MODE) console.log(response);
        return respObj;
    } catch (error) {
        console.log(error.name === 'AbortError');
    }
}

export async function getPlayerStats(userId) {
    try {
        const requestOptions = {
            method: 'GET',
            mode: 'cors',
            headers: authHeader(),
            timeout: 600000
        };

        const response = await fetchWithTimeout(API_URL + '/player_stats?userId=' + userId, requestOptions);
        const respObj = await handleResponse(response);
        if (FETCH_DEBUGGING_MODE) console.log(response);
        return respObj;
    } catch (error) {
        console.log(error.name === 'AbortError');
    }
}

//prevent networkerrors from crashing fetch requests
export async function fetchWithTimeout(resource, options) {
    const {timeout = 8000} = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    if( response===false || response ===undefined){
        return {error: 'Network connection error'};
    }
    return response;
}

//returns an HTTP Authorization header containing the Json Web Token (JWT) of the currently logged in user
export function authHeader() {
    // return authorization header with jwt token
    let sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
        return {'Authorization': sessionToken};
    } else {
        return {};
    }
}

export function handleResponse(response) {
    if(response.status ===401){
        //auto logout user on unauthroised request
        logout();
    }

    return response.text().then(text => {
        const data = text && JSON.parse(text);
        return data;
    });
}