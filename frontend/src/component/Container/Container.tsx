import React from "react";

import s from "./Container.scss"

interface ContainerProps {
    children?: React.ReactNode,
    className?: string
}

export default function Container(props: ContainerProps) {
    const className = `${s.container} ${props.className || ''}`.trim();
    const { className: _, ...restProps } = props;
    return (
        <div className={className} {...restProps}>
            {props.children}
        </div>
    );
}