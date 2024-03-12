import React from "react";

import s from "./DialogPopup.scss"

export interface DialogPopupProps {
    open?: boolean;
    children?: React.ReactNode;
    onClose?: () => void
}

export function DialogPopup(props: DialogPopupProps) {
    if (!props.open)
        return null;
    return (
        <>
            <div className={s.popupBackdrop} onClick={props.onClose}></div>
            <div className={s.popup}>
                {props.children}
            </div>
        </>
    );
}