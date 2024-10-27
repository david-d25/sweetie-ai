import React from "react";

import s from "./Switch.scss";

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children?: React.ReactNode
}

export default function Switch(props: SwitchProps) {
    return (
        <div className={`${s.switchWrapper} ${props.checked ? s.checked : ''}`}
             onClick={() => props.onChange(!props.checked)}>
            <div className={s.switch}>
                <div className={s.handle}></div>
            </div>
            <div className={s.text}>{props.children}</div>
        </div>
    )
}