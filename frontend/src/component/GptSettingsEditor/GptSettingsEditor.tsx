import React, {useEffect, useRef, useState} from "react";
import SliderNumberInput from "../SliderNumberInput/SliderNumberInput";

import s from "./GptSettingsEditor.scss";
import Button from "../Button/Button";
import AnimateHeight from "react-animate-height";
import DropdownSelect from "../DropdownSelect/DropdownSelect";

interface GptSettingsEditorProps {
    value: GptSettingsValue,
    availableGptModels: string[],
    onChange: (value: GptSettingsValue) => any
}

export interface GptSettingsValue {
    maxInputTokens: number,
    maxOutputTokens: number,
    temperature: number,
    topP: number,
    frequencyPenalty: number,
    presencePenalty: number,
    model: string
}

export default function GptSettingsEditor(props: GptSettingsEditorProps) {
    const [maxInputTokens, setMaxInputTokens] = useState(props.value.maxInputTokens);
    const [maxOutputTokens, setMaxOutputTokens] = useState(props.value.maxOutputTokens);
    const [temperature, setTemperature] = useState(props.value.temperature);
    const [topP, setTopP] = useState(props.value.topP);
    const [frequencyPenalty, setFrequencyPenalty] = useState(props.value.frequencyPenalty);
    const [presencePenalty, setPresencePenalty] = useState(props.value.presencePenalty);
    const [model, setModel] = useState(props.value.model);
    const oldValue = useRef<GptSettingsValue>();

    const edited = maxInputTokens !== props.value.maxInputTokens
        || maxOutputTokens !== props.value.maxOutputTokens
        || temperature !== props.value.temperature
        || topP !== props.value.topP
        || frequencyPenalty !== props.value.frequencyPenalty
        || presencePenalty !== props.value.presencePenalty
        || model !== props.value.model;

    useEffect(() => {
        if (JSON.stringify(oldValue.current) != JSON.stringify(props.value)) {
            resetInternalState();
        }
        oldValue.current = props.value;
    }, [props.value]);

    function onSaveClick() {
        props.onChange({
            maxInputTokens,
            maxOutputTokens,
            temperature,
            topP,
            frequencyPenalty,
            presencePenalty,
            model
        });
    }

    function resetInternalState() {
        setMaxInputTokens(props.value.maxInputTokens);
        setMaxOutputTokens(props.value.maxOutputTokens);
        setTemperature(props.value.temperature);
        setTopP(props.value.topP);
        setFrequencyPenalty(props.value.frequencyPenalty);
        setPresencePenalty(props.value.presencePenalty);
        setModel(props.value.model);
    }

    return (
        <div>
            <div className={s.label}>Модель</div>
            <DropdownSelect className={s.input}
                            value={model}
                            options={props.availableGptModels}
                            onChange={setModel}
            />
            <div className={s.label}>Макс. входных токенов</div>
            <SliderNumberInput className={s.input}
                               value={maxInputTokens}
                               onChange={setMaxInputTokens}
                               min={0}
                               step={1}
                               max={16384}
            />
            <div className={s.label}>Макс. выходных токенов</div>
            <SliderNumberInput className={s.input}
                               value={maxOutputTokens}
                               onChange={setMaxOutputTokens}
                               min={0}
                               step={1}
                               max={2048}
            />
            <div className={s.label}>Температура</div>
            <SliderNumberInput className={s.input}
                               value={temperature}
                               onChange={setTemperature}
                               min={0}
                               step={0.001}
                               max={2}
            />
            <div className={s.label}>Top P</div>
            <SliderNumberInput className={s.input}
                               value={topP}
                               onChange={setTopP}
                               min={0}
                               step={0.001}
                               max={1}
            />
            <div className={s.label}>Frequency penalty</div>
            <SliderNumberInput className={s.input}
                               value={frequencyPenalty}
                               onChange={setFrequencyPenalty}
                               min={0}
                               step={0.001}
                               max={2}
            />
            <div className={s.label}>Presence penalty</div>
            <SliderNumberInput className={s.input}
                               value={presencePenalty}
                               onChange={setPresencePenalty}
                               min={0}
                               step={0.001}
                               max={2}
            />
            <AnimateHeight height={edited ? 'auto' : 0}>
                <div className={s.buttons}>
                    <Button onClick={onSaveClick}>Сохранить</Button>
                    <Button onClick={resetInternalState}>Отменить</Button>
                </div>
            </AnimateHeight>
        </div>
    )
}