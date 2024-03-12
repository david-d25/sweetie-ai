import React, {ButtonHTMLAttributes} from "react";

import style from "./Button.scss";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export default function Button(props: ButtonProps) {
    const className = `${style.button} ${props.className || ''}`.trim();
    const { className: _, ...restProps } = props;

    return (
        <button className={className} {...restProps}>
            {props.children}
        </button>
    )
}