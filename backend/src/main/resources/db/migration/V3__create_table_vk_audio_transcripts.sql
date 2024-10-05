create table vk_audio_transcripts (
    id int primary key,
    transcript text,
    attachment_conversation_message_id bigint,
    attachment_peer_id bigint,
    attachment_order_index integer,
    foreign key (attachment_conversation_message_id, attachment_peer_id, attachment_order_index)
        references vk_message_attachments(conversation_message_id, peer_id, order_index)
        on delete cascade on update cascade
);