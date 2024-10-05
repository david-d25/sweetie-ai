create table app_ceos (user_id bigint primary key);

create table chat_admins (peer_id bigint, user_id bigint, primary key (peer_id, user_id));
create index chat_admins_peer_id_idx on chat_admins (peer_id);

create table chat_settings (
    peer_id                bigint primary key,
    name                   text,
    context                text,
    memory                 text,
    gpt_max_output_tokens  integer      default 512,
    gpt_max_input_tokens   integer      default 2500,
    gpt_temperature        real         default 1,
    gpt_top_p              real         default 1,
    gpt_frequency_penalty  real         default 0,
    gpt_presence_penalty   real         default 0,
    bot_enabled            boolean      default true,
    gpt_model              text         default 'gpt-4o',
    process_audio_messages boolean      default false,
    tts_voice              text         default 'alloy'::text,
    tts_speed              real         default 1
);

create table deferred_vk_messages (
    id      serial      primary key,
    peer_id bigint      not null,
    send_at timestamp   not null,
    text    text        not null
);

create table usage_plans (
    id                         text primary key,
    title                      text,
    max_credits                bigint,
    credit_gain_amount         bigint,
    credit_gain_period_seconds bigint,
    visible                    boolean default true
);

create table user_sessions (
    id                        uuid,
    session_token_encrypted   bytea,
    user_vk_id                bigint,
    valid_until               timestamp with time zone,
    vk_access_token_encrypted bytea,
    vk_access_token_id        text
);
create index user_sessions__user_vk_id_index on user_sessions (user_vk_id);

create table vk_message_attachments (
    conversation_message_id bigint  not null,
    peer_id                 bigint  not null,
    order_index             integer not null,
    attachment_dto_json     jsonb,
    primary key (conversation_message_id, peer_id, order_index),
    foreign key (conversation_message_id, peer_id) references vk_messages on update cascade on delete cascade
);
create index vk_message_attachments__conversation_message_id_peer_id_index
    on vk_message_attachments (conversation_message_id, peer_id);

create table vk_message_forwards (
    conversation_message_id           bigint not null,
    peer_id                           bigint not null,
    forwarded_conversation_message_id bigint not null,
    forwarded_peer_id                 bigint not null,
    primary key (conversation_message_id, peer_id, forwarded_conversation_message_id, forwarded_peer_id),
    foreign key (conversation_message_id, peer_id) references vk_messages on update cascade on delete cascade,
    constraint vk_message_forwards_forwarded_conversation_message_id_forw_fkey
        foreign key (forwarded_conversation_message_id, forwarded_peer_id) references vk_messages
            on update cascade on delete cascade
);
create index conversation_message_id_peer_id_index on vk_message_forwards (conversation_message_id, peer_id);

create table vk_messages (
    conversation_message_id bigint,
    peer_id                 bigint,
    from_id                 bigint,
    timestamp               timestamp,
    text                    text,
    primary key (conversation_message_id, peer_id)
);
create index timestamp_index on vk_messages (timestamp);
create index peer_id_index on vk_messages (peer_id);
create index vk_messages__from_id_index on vk_messages (from_id);
create index peer_id_timestamp_index on vk_messages (peer_id asc, timestamp desc);

create table vk_sticker_images (
    sticker_id      bigint,
    size            integer,
    with_background boolean,
    image           bytea,
    primary key (sticker_id, size, with_background)
);

create table vk_sticker_packs (
    id               serial primary key,
    product_id       bigint not null,
    name             text not null,
    description      text,
    first_sticker_id bigint not null,
    sticker_count    integer not null,
    enabled          boolean not null
);
create index vk_sticker_packs__product_id_index on vk_sticker_packs (product_id);
create index vk_sticker_packs__first_sticker_id_index on vk_sticker_packs (first_sticker_id);
create index vk_sticker_packs__enabled_index on vk_sticker_packs (enabled);

create table vk_users (
    id                bigint primary key,
    first_name        text,
    last_name         text,
    credits           bigint    default 0,
    last_credit_gain  timestamp default CURRENT_TIMESTAMP,
    usage_plan_id     text references usage_plans on update cascade on delete set default,
    usage_plan_expiry timestamp
);
create index vk_users__credits on vk_users (credits);

