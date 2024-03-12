import React from 'react';

import style from './LoadingContent.scss';

export enum LoadingContentStatus {
    LOADING,
    READY,
    ERROR
}

export interface LoadingContentProps {
    status: LoadingContentStatus,
    children?: React.ReactNode
}

export default function LoadingContent(props: LoadingContentProps) {
    switch (props.status) {
        case LoadingContentStatus.LOADING:
            return <div className={style.loading}>Загружается...</div>;
        case LoadingContentStatus.READY:
            return <>{props.children}</>;
        case LoadingContentStatus.ERROR:
            return <div className={style.loadingError}>Не получилось загрузить</div>;
        default:
            return null;
    }
}