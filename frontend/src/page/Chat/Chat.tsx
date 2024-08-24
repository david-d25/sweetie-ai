import React, {useEffect, useState} from "react";

import s from "./Chat.scss";
import LoadingContent, {LoadingContentStatus} from "../../component/LoadingContent/LoadingContent";
import {Link, useParams} from "react-router-dom";
import api from "../../api";
import MessagesChart from "../../component/MessagesChart/MessagesChart";
import ContextEditor from "../../component/ContextEditor/ContextEditor";
import GptSettingsEditor, {GptSettingsValue} from "../../component/GptSettingsEditor/GptSettingsEditor";
import UpdatingContent from "../../component/UpdatingContent/UpdatingContent";
import AnimateHeight from "react-animate-height";
import ErrorMessage from "../../component/ErrorMessage/ErrorMessage";
import Container from "../../component/Container/Container";
import Switch from "../../component/Switch/Switch";

const NULL_CHAT = {
    peerId: 0,
    title: null,
    pictureUrl: null,
    botEnabled: true,
    context: null,
    gptMaxInputTokens: 0,
    gptMaxOutputTokens: 0,
    gptTemperature: 0,
    gptTopP: 0,
    gptFrequencyPenalty: 0,
    gptPresencePenalty: 0,
    gptModel: null,
    processAudioMessages: false,
    availableGptModels: []
};

export default function Chat() {
    const { id } = useParams();
    const [loadingStatus, setLoadingStatus] = useState(LoadingContentStatus.LOADING);
    const [chat, setChat] = useState(NULL_CHAT);
    const [notFound, setNotFound] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const [contextUpdating, setContextUpdating] = useState(false);
    const [gptSettingsUpdating, setGptSettingsUpdating] = useState(false);
    const [botEnabledUpdating, setBotEnabledUpdating] = useState(false);
    const [processAudioMessagesUpdating, setProcessAudioMessagesUpdating] = useState(false);

    const [contextUpdateError, setContextUpdateError] = useState(false);
    const [gptSettingsUpdateError, setGptSettingsUpdateError] = useState(false);
    const [botEnabledUpdateError, setBotEnabledUpdateError] = useState(false);
    const [processAudioMessagesUpdateError, setProcessAudioMessagesUpdateError] = useState(false);

    const gptSettings: GptSettingsValue = {
        maxInputTokens: chat.gptMaxInputTokens,
        maxOutputTokens: chat.gptMaxOutputTokens,
        temperature: chat.gptTemperature,
        topP: chat.gptTopP,
        frequencyPenalty: chat.gptFrequencyPenalty,
        presencePenalty: chat.gptPresencePenalty,
        model: chat.gptModel
    };

    useEffect(() => {
        document.title = "Беседа";
    }, []);

    useEffect(() => {
        api.get('/chat/' + id).then(response => {
            setChat(response.data);
            setLoadingStatus(LoadingContentStatus.READY);
        }).catch(error => {
            if (error.response && error.response.status === 404) {
                setNotFound(true);
            } else {
                setLoadingStatus(LoadingContentStatus.ERROR);
            }
        });
    }, []);

    function onContextChange(value: string) {
        if (contextUpdating) {
            return;
        }
        setContextUpdating(true);
        api.post('/chat/' + id, { context: value }).then(response => {
            setChat(response.data);
            setContextUpdateError(false);
        }).catch(() => {
            setContextUpdateError(true);
        }).finally(() => {
            setContextUpdating(false);
        });
    }

    function onGptSettingsChange(value: GptSettingsValue) {
        if (gptSettingsUpdating) {
            return;
        }
        setGptSettingsUpdating(true);
        api.post('/chat/' + id, {
            gptMaxInputTokens: value.maxInputTokens,
            gptMaxOutputTokens: value.maxOutputTokens,
            gptTemperature: value.temperature,
            gptTopP: value.topP,
            gptFrequencyPenalty: value.frequencyPenalty,
            gptPresencePenalty: value.presencePenalty,
            gptModel: value.model
        }).then(response => {
            setChat(response.data);
            setGptSettingsUpdateError(false);
        }).catch(() => {
            setGptSettingsUpdateError(true);
        }).finally(() => {
            setGptSettingsUpdating(false);
        });
    }

    function showAdvanced() {
        setShowAdvancedSettings(true);
    }

    function hideAdvanced() {
        setShowAdvancedSettings(false);
    }

    function toggleBotEnabled() {
        if (botEnabledUpdating) {
            return;
        }
        setBotEnabledUpdating(true);
        api.post('/chat/' + id, { botEnabled: !chat.botEnabled }).then(response => {
            setChat(response.data);
            setBotEnabledUpdateError(false);
        }).catch(() => {
            setBotEnabledUpdateError(true);
        }).finally(() => {
            setBotEnabledUpdating(false);
        });
    }

    function toggleProcessAudioMessages() {
        if (processAudioMessagesUpdating) {
            return;
        }
        setProcessAudioMessagesUpdating(true);
        api.post('/chat/' + id, { processAudioMessages: !chat.processAudioMessages }).then(response => {
            setChat(response.data);
            setProcessAudioMessagesUpdateError(false);
        }).catch(() => {
            setProcessAudioMessagesUpdateError(true);
        }).finally(() => {
            setProcessAudioMessagesUpdating(false);
        });
    }

    return (
        <div className={s.chat}>
            { notFound && (
                <div className={s.notFound}>
                    <div className={s.text}>Беседа не найдена</div>
                    <Link className={s.link} to="/">Пошли домой</Link>
                </div>
            ) || (
                <Container>
                    <LoadingContent status={loadingStatus}>
                        <div className={s.header}>
                            <img alt="Chat picture"
                                 className={s.picture}
                                 src={chat.pictureUrl || 'https://vk.com/images/camera_200.png'}
                            />
                            <div className={s.title}>
                                {chat.title || ("Чат #" + chat.peerId)}
                            </div>
                        </div>
                        <div className={`${s.switchWrapper} ${botEnabledUpdating ? s.updating : ''}`}>
                            <Switch checked={chat.botEnabled} onChange={toggleBotEnabled}>
                                Сладенький { chat.botEnabled ? "включен" : "выключен" }
                            </Switch>
                        </div>
                        <AnimateHeight className={s.switchErrorWrapper} height={botEnabledUpdateError ? 'auto' : 0}>
                            <ErrorMessage message={
                                chat.botEnabled ? "Не получилось выключить" : "Не получилось включить"
                            }/>
                        </AnimateHeight>
                        <div className={s.panel}>
                            <div className={s.title}>Сообщения</div>
                            { chat.peerId != null && (
                                <MessagesChart peerIdFilter={chat.peerId}/>
                            )}
                        </div>
                        <div className={s.panel}>
                            <div className={s.title}>Инструкции</div>
                            <AnimateHeight height={contextUpdateError ? 'auto' : 0}>
                                <ErrorMessage message="Не получилось сохранить"/>
                            </AnimateHeight>
                            <UpdatingContent isUpdating={contextUpdating}>
                                <ContextEditor value={chat.context} maxLength={128000} onChange={onContextChange}/>
                            </UpdatingContent>
                        </div>
                        <div className={`${s.switchWrapper} ${processAudioMessagesUpdating ? s.updating : ''}`}>
                            <Switch checked={chat.processAudioMessages} onChange={toggleProcessAudioMessages}>
                                { chat.processAudioMessages ? "Сладенький слушает голосовые" : "Сладенький не слушает голосовые" }
                            </Switch>
                        </div>
                        <AnimateHeight className={s.switchErrorWrapper} height={processAudioMessagesUpdateError ? 'auto' : 0}>
                            <ErrorMessage message={
                                "Не получилось переключить"
                            }/>
                        </AnimateHeight>
                        { showAdvancedSettings && (
                            <div className={s.inlineButton} onClick={hideAdvanced}>
                                Спрятать продвинутые настройки
                            </div>
                        ) || (
                            <div className={s.inlineButton} onClick={showAdvanced}>
                                Показать продвинутые настройки
                            </div>
                        )}
                        <AnimateHeight height={showAdvancedSettings ? 'auto' : 0}>
                            <div className={s.panel}>
                                <div className={s.title}>Настройки GPT</div>
                                <AnimateHeight height={gptSettingsUpdateError ? 'auto' : 0}>
                                    <ErrorMessage message="Не получилось сохранить"/>
                                </AnimateHeight>
                                <UpdatingContent isUpdating={gptSettingsUpdating}>
                                    <GptSettingsEditor value={gptSettings}
                                                       availableGptModels={chat.availableGptModels}
                                                       onChange={onGptSettingsChange}
                                    />
                                </UpdatingContent>
                            </div>
                        </AnimateHeight>
                    </LoadingContent>
                </Container>
            )}
        </div>
    )
}