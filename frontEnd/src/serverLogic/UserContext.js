import React from 'react';

export class user{
    constructor(username,token) {
        this.username=username;
        this.token=token;
    }
}

export const userContext = React.createContext({user: {}});

