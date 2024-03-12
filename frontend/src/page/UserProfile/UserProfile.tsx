import React, {useEffect, useState} from 'react';

import style from './UserProfile.scss';
import LoadingContent, {LoadingContentStatus} from "../../component/LoadingContent/LoadingContent";
import api from "../../api";
import MessagesChart from "../../component/MessagesChart/MessagesChart";
import Container from "../../component/Container/Container";

const NULL_USER = {
    vkId: null,
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
};

export default function UserProfile() {
    const [loadingStatus, setLoadingStatus] = useState(LoadingContentStatus.LOADING);
    const [user, setUser] = useState(NULL_USER);

    useEffect(() => {
        document.title = "Профиль";
    }, []);

    useEffect(() => {
        api.get('/user').then(response => {
            if (response.status !== 200) {
                setLoadingStatus(LoadingContentStatus.ERROR);
            } else {
                setUser(response.data);
                setLoadingStatus(LoadingContentStatus.READY);
            }
        }).catch(() => {
            setLoadingStatus(LoadingContentStatus.ERROR);
        });
    }, []);

    return (
        <div className={style.userProfile}>
            <LoadingContent status={loadingStatus}>
                <Container>
                    <div className={style.userMain}>
                        <img className={style.profilePicture} src={user.photoUrl} alt="Profile picture"/>
                        <div className={style.userName}>{user.firstName} {user.lastName}</div>
                    </div>
                    <div className={style.userUsagePlan}>
                        <div className={style.name}>
                            Sweetie {user.usagePlan.title}
                        </div>
                        <div className={style.credits}>
                            Кредиты: {user.credits}/{user.usagePlan.maxCredits}
                        </div>
                        { user.usagePlan.creditGainPeriodSeconds > 0 && (
                            <div className={style.creditsGain}>
                                Восполнение: {Math.round(
                                user.usagePlan.creditGainAmount / user.usagePlan.creditGainPeriodSeconds * 3600 * 10
                            ) / 10} к/ч
                            </div>
                        )}
                        <div className={style.expiry}>
                            { user.usagePlanExpiry && (
                                <>Действует до { new Date(user.usagePlanExpiry * 1000).toLocaleDateString("ru-RU") }</>
                            ) || (
                                <>Действует вечно</>
                            )}
                        </div>
                    </div>
                    <div className={style.userMessageStatistics}>
                        <div className={style.title}>Мои сообщения</div>
                        { user.vkId != null && (
                            <MessagesChart fromIdFilter={user.vkId}/>
                        )}
                    </div>
                </Container>
            </LoadingContent>
        </div>
    )
}