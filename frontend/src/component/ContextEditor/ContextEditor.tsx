import React, {useEffect, useState} from "react";

import s from "./ContextEditor.scss";
import Button from "../Button/Button";
import AnimateHeight from "react-animate-height";

interface ContextEditorProps {
    value: string,
    maxLength: number,
    onChange: (value: string) => any
}

export default function ContextEditor(props: ContextEditorProps) {
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(props.value);
    const edited = internalValue != props.value;

    useEffect(() => {
        setInternalValue(props.value);
    }, [props.value]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (edited) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [internalValue]);

    return (
        <div className={s.wrapper}>
            <div className={s.textWrapper}>
                <textarea className={s.textarea}
                          maxLength={props.maxLength}
                          placeholder="Пусто..."
                          value={internalValue ? internalValue : ''}
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          onChange={e => setInternalValue(e.target.value)}
                          spellCheck="false"/>
                <div className={`${s.fade} ${focused ? s.hidden : ''}`}></div>
            </div>
            <AnimateHeight height={edited ? 'auto' : 0}>
                <div className={s.buttons}>
                    <Button onClick={() => props.onChange(internalValue)}>Сохранить</Button>
                    <Button onClick={() => setInternalValue(props.value)}>Отменить</Button>
                </div>
            </AnimateHeight>
        </div>
    )
}