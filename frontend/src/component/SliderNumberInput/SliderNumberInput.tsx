import React, {ChangeEvent, useEffect, useState} from "react";

import s from "./SliderNumberInput.scss";
import Slider from "../Slider/Slider";

interface SliderNumberInputProps {
    min?: number,
    max?: number,
    step?: number,
    disabled?: boolean,
    value?: number,
    onChange: (value: number) => any,
    className?: string
}

export default function SliderNumberInput(props: SliderNumberInputProps) {
    const className = `${s.wrapper} ${props.className || ''}`.trim();

    const [internalTextState, setInternalTextState] = useState('');

    function onTextChange(event: ChangeEvent<HTMLInputElement>) {
        const text = event.target.value;
        setInternalTextState(text);
        if (!isNaN(+text)) {
            props.onChange(+text);
        }
    }

    useEffect(() => {
        setInternalTextState(props.value.toString());
    }, [props.value]);

    return (
        <div className={className}>
            <Slider className={s.slider}
                    onChange={props.onChange}
                    min={props.min}
                    max={props.max}
                    step={props.step}
                    value={props.value}
                    disabled={props.disabled}
            />
            <input className={s.textInput}
                   type="text"
                   value={internalTextState}
                   disabled={props.disabled}
                   onChange={onTextChange}
            />
        </div>
    )
}