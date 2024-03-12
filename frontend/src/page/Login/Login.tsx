import React, {useEffect} from "react";

import style from "./Login.scss";
import VkLoginButton from "../../component/VkLoginButton/VkLoginButton";
import {getCookie} from "../../util/Cookies";
import {useNavigate} from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Войти";
    }, []);

    useEffect(() => {
        const userVkId = getCookie("Sweetie-User-Vk-Id");
        if (userVkId) {
            navigate("/dashboard", { replace: true });
        }
    }, []);

    return (
        <div className={style.login}>
            <div className={style.body}>
                <VkLoginButton/>
            </div>
        </div>
    );
}