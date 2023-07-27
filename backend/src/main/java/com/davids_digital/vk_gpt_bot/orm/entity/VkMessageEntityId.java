package com.davids_digital.vk_gpt_bot.orm.entity;

import java.io.Serializable;

public class VkMessageEntityId implements Serializable {
    public long conversationMessageId;
    public long peerId;

    public VkMessageEntityId() {}

    public VkMessageEntityId(
            long conversationMessageId,
            long peerId
    ) {
        this.conversationMessageId = conversationMessageId;
        this.peerId = peerId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        VkMessageEntityId that = (VkMessageEntityId) o;

        if (conversationMessageId != that.conversationMessageId) return false;
        return peerId == that.peerId;
    }

    @Override
    public int hashCode() {
        int result = (int) (conversationMessageId ^ (conversationMessageId >>> 32));
        result = 31 * result + (int) (peerId ^ (peerId >>> 32));
        return result;
    }
}
