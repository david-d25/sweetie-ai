import React, {useState} from "react";

import s from "./Header.scss";
import {Link, useLocation} from "react-router-dom";
import Button from "../Button/Button";
import Settings from "../Settings/Settings";
import {DialogPopup} from "../DialogPopup/DialogPopup";
import Container from "../Container/Container";

export default function Header() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const location = useLocation();
    const knownHomeLocations = ['/', '/login', '/dashboard'];

    const showBackIcon = !knownHomeLocations.includes(location.pathname);

    return (
        <>
            <div className={s.header}>
                <Container className={s.headerContent}>
                    <Link to="/" className={s.homeLink}>
                        <svg className={`${s.icon} ${s.backIcon} ${showBackIcon ? s.visible : ''}`} viewBox="0 0 100 100">
                            <path d="M 50 10 L 10 50 L 50 90"
                                  strokeWidth="10"
                                  fill="none"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"/>
                        </svg>
                        <span className={s.text}>Сладенький</span>
                    </Link>
                    <button className={s.headerButton} onClick={() => setSettingsOpen(true)}>
                        <svg className={s.icon} viewBox="0 0 100 100">
                            <rect x="0" y="0" width="100" height="20" rx="10" ry="10" fill="#b0b0b0"></rect>
                            <rect x="0" y="40" width="100" height="20" rx="10" ry="10" fill="#b0b0b0"></rect>
                            <rect x="0" y="80" width="100" height="20" rx="10" ry="10" fill="#b0b0b0"></rect>
                        </svg>
                    </button>
                </Container>
            </div>
            <DialogPopup open={settingsOpen} onClose={() => setSettingsOpen(false)}>
                <Settings onLogout={() => setSettingsOpen(false)}/>
                <Button className={s.settingsCloseButton} onClick={() => setSettingsOpen(false)}>Закрыть</Button>
            </DialogPopup>
        </>
    );
}