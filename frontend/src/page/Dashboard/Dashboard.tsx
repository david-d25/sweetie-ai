import React, {useEffect, useState} from 'react';

import style from './Dashboard.scss';
import LoadingContent, {LoadingContentStatus} from "../../component/LoadingContent/LoadingContent";
import Button from "../../component/Button/Button";
import {useNavigate} from "react-router-dom";
import api from "../../api";
import Container from "../../component/Container/Container";

const NULL_DASHBOARD = {
    user: {
        photoUrl: null,
        firstName: null,
        lastName: null,
        credits: 0,
        usagePlan: {
            title: null,
            credits: 0,
            maxCredits: 0,
            creditGainPeriodSeconds: 0,
            creditGainAmount: 0,
        },
        usagePlanExpiry: null
    },
    chats: [{
        peerId: 0,
        title: null,
        pictureUrl: null,
        botEnabled: true
    }]
};

export default function Dashboard() {
    const navigate = useNavigate();

    const [loadingStatus, setLoadingStatus] = useState(LoadingContentStatus.LOADING);
    const [dashboard, setDashboard] = useState(NULL_DASHBOARD);

    useEffect(() => {
        document.title = "Дашборд";
    }, []);

    useEffect(() => {
        api.get('/dashboard').then(response => {
            if (response.status !== 200) {
                setLoadingStatus(LoadingContentStatus.ERROR);
            } else {
                setDashboard(response.data);
                setLoadingStatus(LoadingContentStatus.READY);
            }
        }).catch(() => {
            setLoadingStatus(LoadingContentStatus.ERROR);
        });
    }, []);

    return (
        <div className={style.dashboard}>
            <Container>
                <LoadingContent status={loadingStatus}>
                    <div className={style.subtitle}>Профиль</div>
                    <Button className={style.goToButton} onClick={() => navigate('/user')}>
                        <img alt="User profile picture" src={dashboard.user.photoUrl} className={style.picture}/>
                        <div className={style.info}>
                            <div className={style.title}>{dashboard.user.firstName} {dashboard.user.lastName}</div>
                            <div className={style.plan}>Sweetie {dashboard.user.usagePlan.title}</div>
                        </div>
                    </Button>
                    <div className={style.subtitle}>Беседы</div>
                    { dashboard.chats.map(chat => (
                        <Button key={chat.peerId} className={style.goToButton} onClick={() => navigate('/chat/' + chat.peerId)}>
                            <img alt="Chat profile picture" src={chat.pictureUrl || 'https://vk.com/images/camera_200.png'} className={style.picture}/>
                            <div className={style.info}>
                                <div className={style.title}>{chat.title || ("Чат #" + chat.peerId)}</div>
                                { chat.botEnabled && (
                                    <div className={style.plan}>Сладенький включен</div>
                                ) || (
                                    <div className={style.plan}>Сладенький выключен</div>
                                )}
                            </div>
                        </Button>
                    ))}
                    { dashboard.chats.length == 0 && (
                        <div className={style.noChats}>
                            Пусто
                        </div>
                    )}
                </LoadingContent>
            </Container>
        </div>
    )
}