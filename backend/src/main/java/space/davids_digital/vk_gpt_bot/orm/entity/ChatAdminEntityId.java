package space.davids_digital.vk_gpt_bot.orm.entity;

import java.io.Serializable;

public class ChatAdminEntityId implements Serializable {
    public long peerId;
    public long userId;

    public ChatAdminEntityId() {}

    public ChatAdminEntityId(long peerId, long userId) {
        this.peerId = peerId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        ChatAdminEntityId that = (ChatAdminEntityId) o;

        if (peerId != that.peerId) return false;
        return userId == that.userId;
    }

    @Override
    public int hashCode() {
        int result = (int) (peerId ^ (peerId >>> 32));
        result = 31 * result + (int) (userId ^ (userId >>> 32));
        return result;
    }
}
