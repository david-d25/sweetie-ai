import React from "react";

import s from "./Slider.scss";

interface NumberSliderProps {
    min?: number,
    max?: number,
    step?: number,
    disabled?: boolean,
    value?: number,
    onChange: (value: number) => any,
    className?: string
}

export default function Slider(props: NumberSliderProps) {
    const className = `${s.input} ${props.className || ''}`.trim();
    return (
        <input type="range"
               className={className}
               disabled={props.disabled}
               min={props.min}
               max={props.max}
               step={props.step}
               value={props.value}
               onChange={e => props.onChange(+e.target.value)}
        />
    )
}