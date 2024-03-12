import React from "react";

import s from "./ThemeSwitch.scss";
import {useRecoilState} from "recoil";
import {themeState} from "../../state/themeState";

export default function ThemeSwitch() {
    const [theme, setTheme] = useRecoilState(themeState);

    function toggle() {
        setTheme(theme === "light" ? "dark" : "light");
    }

    return (
        <div className={s.themeSwitch} onClick={toggle}>
            <div className={s.text}>
                Темная тема
            </div>
            <div className={s.switch}>
                <div className={s.handle}></div>
            </div>
        </div>
    )
}