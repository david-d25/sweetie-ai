import React from 'react';

import s from './UpdatingContent.scss';

export interface LoadingContentProps {
    isUpdating: boolean
    children?: React.ReactNode
}

export default function UpdatingContent(props: LoadingContentProps) {
    const className = `${s.wrapper} ${props.isUpdating ? s.updating : ''}`.trim();
    return (
        <div className={className}>
            <div className={`${s.children} ${props.isUpdating ? s.loading : ''}`}>
                {props.children}
            </div>
            {props.isUpdating && <div className={s.loadingAnimation}></div>}
        </div>
    )
}