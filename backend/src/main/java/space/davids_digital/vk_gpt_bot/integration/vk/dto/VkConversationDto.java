package space.davids_digital.vk_gpt_bot.integration.vk.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VkConversationDto {
    @JsonProperty("peer")
    public Peer peer;

    @JsonProperty("last_message_id")
    public long lastMessageId;

    @JsonProperty("last_conversation_message_id")
    public long lastConversationMessageId;

    @JsonProperty("in_read")
    public long inRead;

    @JsonProperty("out_read")
    public long outRead;

    @JsonProperty("in_read_cmid")
    public long inReadCmid;

    @JsonProperty("out_read_cmid")
    public long outReadCmid;

    @JsonProperty("version")
    public long version;

    @JsonProperty("sort_id")
    public SortId sortId;

    @JsonProperty("unread_count")
    public long unreadCount;

    @JsonProperty("is_marked_unread")
    public boolean isMarkedUnread;

    @JsonProperty("important")
    public boolean important;

    @JsonProperty("unanswered")
    public boolean unanswered;

    @JsonProperty("can_write")
    public CanWrite canWrite;

    @JsonProperty("chat_settings")
    public ChatSettings chatSettings;

    @JsonProperty("peer_flags")
    public long peerFlags;

    public static class ChatSettings {
        @JsonProperty("title")
        public String title;

        @JsonProperty("members_count")
        public long membersCount;

        @JsonProperty("owner_id")
        public long ownerId;

        @JsonProperty("description")
        public String description;

        @JsonProperty("pinned_messages_count")
        public long pinnedMessagesCount;

        @JsonProperty("state")
        public String state;

        @JsonProperty("photo")
        public Photo photo;

        @JsonProperty("admin_ids")
        public long[] adminIds;

        @JsonProperty("active_ids")
        public long[] activeIds;

        @JsonProperty("is_group_channel")
        public boolean isGroupChannel;

        @JsonProperty("acl")
        public Acl acl;

        @JsonProperty("permissions")
        public Permissions permissions;

        @JsonProperty("is_disappearing")
        public boolean isDisappearing;

        @JsonProperty("is_service")
        public boolean isService;

        public static class Photo {
            @JsonProperty("photo_50")
            public String photo50;

            @JsonProperty("photo_100")
            public String photo100;

            @JsonProperty("photo_200")
            public String photo200;

            @JsonProperty("is_default_photo")
            public boolean isDefaultPhoto;

            @JsonProperty("is_default_call_photo")
            public boolean isDefaultCallPhoto;
        }

        public static class Acl {
            @JsonProperty("can_change_info")
            public boolean canChangeInfo;

            @JsonProperty("can_change_invite_link")
            public boolean canChangeInviteLink;

            @JsonProperty("can_change_pin")
            public boolean canChangePin;

            @JsonProperty("can_invite")
            public boolean canInvite;

            @JsonProperty("can_promote_users")
            public boolean canPromoteUsers;

            @JsonProperty("can_see_invite_link")
            public boolean canSeeInviteLink;

            @JsonProperty("can_moderate")
            public boolean canModerate;

            @JsonProperty("can_copy_chat")
            public boolean canCopyChat;

            @JsonProperty("can_call")
            public boolean canCall;

            @JsonProperty("can_use_mass_mentions")
            public boolean canUseMassMentions;

            @JsonProperty("can_change_style")
            public boolean canChangeStyle;

            @JsonProperty("can_send_reactions")
            public boolean canSendReactions;

            @JsonProperty("can_change_stickers_popup_autoplay")
            public boolean canChangeStickersPopupAutoplay;
        }

        public static class Permissions {
            @JsonProperty("invite")
            public String invite;

            @JsonProperty("change_info")
            public String changeInfo;

            @JsonProperty("change_pin")
            public String changePin;

            @JsonProperty("use_mass_mentions")
            public String useMassMentions;

            @JsonProperty("see_invite_link")
            public String seeInviteLink;

            @JsonProperty("call")
            public String call;

            @JsonProperty("change_admins")
            public String changeAdmins;

            @JsonProperty("change_style")
            public String changeStyle;
        }
    }

    public static class CanWrite {
        @JsonProperty("allowed")
        public boolean allowed;
    }


    public static class SortId {
        @JsonProperty("major_id")
        public long majorId;

        @JsonProperty("minor_id")
        public long minorId;
    }

    public static class Peer {
        @JsonProperty("id")
        public long id;

        @JsonProperty("type")
        public String type;

        @JsonProperty("local_id")
        public long localId;
    }
}
