import React, {useEffect} from "react";
import {Link} from "react-router-dom";

import s from "./NotFound.scss";

export default function NotFound() {
    useEffect(() => {
        document.title = "Не найдено";
    }, []);
    return (
        <div className={s.notFound}>
            <div className={s.text}>Страница не найдена</div>
            <Link className={s.link} to="/">Пошли домой</Link>
        </div>
    )
}