import React from "react";
import Section from "../CommonComponents/Section";
import LoginForm from "./Components/LoginForm";
import WatchLiveWidget from "./Components/WatchLiveWidget";
import RegisterForm from "./Components/RegisterForm";

export default function LogRegScreen() {

    return (
        <div>
            <Section section="LOGIN">
                <LoginForm/>
                <WatchLiveWidget/>
            </Section>

            <Section section="REGISTER">
                <RegisterForm/>
            </Section>
        </div>
    );
}