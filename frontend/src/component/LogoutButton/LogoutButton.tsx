import React, {useState} from "react";
import Button from "../Button/Button";
import {getCookie} from "../../util/Cookies";
import {useNavigate} from "react-router-dom";
import api from "../../api";

interface LogoutButtonProps {
    onLogout: () => any
}

export default function LogoutButton(props: LogoutButtonProps) {
    const userVkId = getCookie("Sweetie-User-Vk-Id");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function logout() {
        setLoading(true);
        api.post("/logout").finally(() => {
            props.onLogout();
            navigate("/login");
        });
    }

    if (userVkId) {
        return <Button onClick={logout} disabled={loading}>{loading ? "Выходим..." : "Выйти из системы"}</Button>;
    }
    return null;
}