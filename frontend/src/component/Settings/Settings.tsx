import React from "react";

import s from "./Settings.scss";
import ThemeSwitch from "../../component/ThemeSwitch/ThemeSwitch";
import LogoutButton from "../LogoutButton/LogoutButton";


interface SettingsProps {
    onLogout: () => any
}

export default function Settings(props: SettingsProps) {
    return (
        <div className={s.settings}>
            <div className={s.title}>Настройки</div>
            <div><ThemeSwitch/></div>
            <div className={s.logoutWrapper}><LogoutButton onLogout={props.onLogout}/></div>
        </div>
    );
}