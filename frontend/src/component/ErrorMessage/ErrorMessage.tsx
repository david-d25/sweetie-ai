import React from "react";

import s from "./ErrorMessage.scss";

interface ErrorMessageProps {
    message: string
}

export default function ErrorMessage(props: ErrorMessageProps) {
    return (
        <div className={s.errorMessage}>
            {props.message}
        </div>
    );
}