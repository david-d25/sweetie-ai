import React from "react";

import s from "./DropdownSelect.scss";

interface DropdownSelectProps {
    value: string,
    options: string[],
    onChange: (value: string) => any,
    className: string
}

export default function DropdownSelect(props: DropdownSelectProps) {
    const className = `${s.select} ${props.className || ''}`.trim();
    return (
        <select className={className} value={props.value} onChange={event => props.onChange(event.target.value)}>
            {props.options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    )
}