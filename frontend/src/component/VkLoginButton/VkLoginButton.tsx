import Button from "../../component/Button/Button";
import React from "react";

import style from "./VkLoginButton.scss";

export default function VkLoginButton() {
    function onClick() {
        const uuid = crypto.randomUUID();
        const appId = process.env['VK_APP_ID'];
        const redirectUri = process.env['API_URL'] + '/auth/vk-id';
        const redirect_state = 'I dunno what to put here';

        const query = `uuid=${uuid}&app_id=${appId}&response_type=silent_token&redirect_uri=${redirectUri}&redirect_state=${redirect_state}`;
        location.assign(`https://id.vk.com/auth?${query}`);
    }

    return (
        <Button onClick={onClick}>
            <div className={style.vkLogin}>
                <span className={style.vkIconWrapper}>
                    <img src="/image/vk-logo.png" alt="VK Icon" className={style.vkIcon}/>
                </span>
                <span className={style.text}>
                    Войти через VK
                </span>
            </div>
        </Button>
    );
}