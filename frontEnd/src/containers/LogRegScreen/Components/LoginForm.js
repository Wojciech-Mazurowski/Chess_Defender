import React, {useContext, useState} from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import "./LogRegForm.css";
import "../../../serverLogic/APIConfig.js"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import SectionTitle from "../../CommonComponents/SectionTitle"
import {useHistory } from 'react-router-dom';
import {login,logout} from "../../../serverLogic/LogRegService"
import {connect} from 'react-redux'
import {setSessionToken, setUserElo, setUserId, setUsername} from "../../../redux/actions/userActions";

function LoginForm({dispatch}) {
    const [username, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [passwordShown, setPasswordShown] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const togglePasswordVisiblity = () => {setPasswordShown(!passwordShown);};
    const eye = <FontAwesomeIcon icon={faEye} />;

    //routing after succesfull login
    const history = useHistory();
    const routeToNext = () => history.push('/');


    //if this component is mounted the user must be logedout
    function componentDidMount(){
        logout();
    }

    async function HandleSubmit(event) {
        event.preventDefault();
        //reset error message
        setErrorMessage("");
        let resp=await login(username,password)

        if (resp.error !== undefined){
            setErrorMessage(resp.error);
            return;
        }

        dispatch(setUserId(resp.userId));
        dispatch(setUsername(username));
        dispatch(setUserElo(resp.userElo));
        dispatch(setSessionToken(resp.sessionToken));
        routeToNext();
    }


    return (

        <div className="LogRegForm">
            <SectionTitle>LOGIN</SectionTitle>
            <Form onSubmit={HandleSubmit}>

            <Form.Control
                required
                placeholder="Username..."
                autoFocus
                type="text"
                value={username}
                onChange={(e) => setUserName(e.target.value)}
            />

            <div className="pass-wrapper">
                <Form.Control
                    required
                    placeholder="Password..."
                    type={passwordShown ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <i
                    onClick={togglePasswordVisiblity}
                    style={{ color: passwordShown ? '#da8b43' : 'black' }}
                >{eye}</i>
            </div>

            <div style={{ visibility: errorMessage !== "" ? 'visible' : 'hidden' }} className="errorMessage">{errorMessage}</div>

        <Button type="submit" >LOGIN</Button>
            </Form>
        </div>
    );
}

// Connect Redux to React
export default connect()(LoginForm)