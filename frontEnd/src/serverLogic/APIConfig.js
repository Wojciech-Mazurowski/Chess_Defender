const API = {
    IP: '192.168.1.56',
    PORT: '5000',
}

//no backtick at the end
export const API_URL='http://'+API.IP+':'+API.PORT;

export function createAPIRequestOptions(method,payload){
    return {
        method: method,
        mode: 'cors',
        headers: { 'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Headers' : '*'},
        body: JSON.stringify(payload)
    };
}


