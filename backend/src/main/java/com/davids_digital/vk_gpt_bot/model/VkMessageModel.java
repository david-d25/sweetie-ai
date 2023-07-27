package com.davids_digital.vk_gpt_bot.model;

import java.time.Instant;

public class VkMessageModel {
    private long conversationMessageId;
    private long peerId;
    private long fromId;
    private Instant timestamp;
    private String text;

    public VkMessageModel(long conversationMessageId, long peerId, long fromId, Instant timestamp, String text) {
        this.conversationMessageId = conversationMessageId;
        this.peerId = peerId;
        this.fromId = fromId;
        this.timestamp = timestamp;
        this.text = text;
    }

    public long getConversationMessageId() {
        return conversationMessageId;
    }

    public void setConversationMessageId(long conversationMessageId) {
        this.conversationMessageId = conversationMessageId;
    }

    public long getPeerId() {
        return peerId;
    }

    public void setPeerId(long peerId) {
        this.peerId = peerId;
    }

    public long getFromId() {
        return fromId;
    }

    public void setFromId(long fromId) {
        this.fromId = fromId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        VkMessageModel that = (VkMessageModel) o;

        if (conversationMessageId != that.conversationMessageId) return false;
        if (peerId != that.peerId) return false;
        if (fromId != that.fromId) return false;
        if (timestamp != that.timestamp) return false;
        return text.equals(that.text);
    }

    @Override
    public int hashCode() {
        int result = (int) (conversationMessageId ^ (conversationMessageId >>> 32));
        result = 31 * result + (int) (peerId ^ (peerId >>> 32));
        result = 31 * result + (int) (fromId ^ (fromId >>> 32));
        result = 31 * result + (timestamp != null ? timestamp.hashCode() : 0);
        result = 31 * result + (text != null ? text.hashCode() : 0);
        return result;
    }
}
