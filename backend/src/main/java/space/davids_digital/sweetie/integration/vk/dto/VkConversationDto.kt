package space.davids_digital.sweetie.integration.vk.dto

import com.fasterxml.jackson.annotation.JsonProperty

@Deprecated("Use new API")
open class VkConversationDto {
    @JsonProperty("peer")
    var peer: Peer? = null

    @JsonProperty("last_message_id")
    var lastMessageId: Long = 0

    @JsonProperty("last_conversation_message_id")
    var lastConversationMessageId: Long = 0

    @JsonProperty("in_read")
    var inRead: Long = 0

    @JsonProperty("out_read")
    var outRead: Long = 0

    @JsonProperty("in_read_cmid")
    var inReadCmid: Long = 0

    @JsonProperty("out_read_cmid")
    var outReadCmid: Long = 0

    @JsonProperty("version")
    var version: Long = 0

    @JsonProperty("sort_id")
    var sortId: SortId? = null

    @JsonProperty("unread_count")
    var unreadCount: Long = 0

    @JsonProperty("is_marked_unread")
    var isMarkedUnread = false

    @JsonProperty("important")
    var important = false

    @JsonProperty("unanswered")
    var unanswered = false

    @JsonProperty("can_write")
    var canWrite: CanWrite? = null

    @JvmField
    @JsonProperty("chat_settings")
    var chatSettings: ChatSettings? = null

    @JsonProperty("peer_flags")
    var peerFlags: Long = 0

    open class ChatSettings {
        @JvmField
        @JsonProperty("title")
        var title: String? = null

        @JsonProperty("members_count")
        var membersCount: Long = 0

        @JsonProperty("owner_id")
        var ownerId: Long = 0

        @JsonProperty("description")
        var description: String? = null

        @JsonProperty("pinned_messages_count")
        var pinnedMessagesCount: Long = 0

        @JsonProperty("state")
        var state: String? = null

        @JvmField
        @JsonProperty("photo")
        var photo: Photo? = null

        @JsonProperty("admin_ids")
        lateinit var adminIds: LongArray

        @JsonProperty("active_ids")
        lateinit var activeIds: LongArray

        @JsonProperty("is_group_channel")
        var isGroupChannel = false

        @JsonProperty("acl")
        var acl: Acl? = null

        @JsonProperty("permissions")
        var permissions: Permissions? = null

        @JsonProperty("is_disappearing")
        var isDisappearing = false

        @JsonProperty("is_service")
        var isService = false

        open class Photo {
            @JsonProperty("photo_50")
            var photo50: String? = null

            @JsonProperty("photo_100")
            var photo100: String? = null

            @JvmField
            @JsonProperty("photo_200")
            var photo200: String? = null

            @JsonProperty("is_default_photo")
            var isDefaultPhoto = false

            @JsonProperty("is_default_call_photo")
            var isDefaultCallPhoto = false
        }

        open class Acl {
            @JsonProperty("can_change_info")
            var canChangeInfo = false

            @JsonProperty("can_change_invite_link")
            var canChangeInviteLink = false

            @JsonProperty("can_change_pin")
            var canChangePin = false

            @JsonProperty("can_invite")
            var canInvite = false

            @JsonProperty("can_promote_users")
            var canPromoteUsers = false

            @JsonProperty("can_see_invite_link")
            var canSeeInviteLink = false

            @JsonProperty("can_moderate")
            var canModerate = false

            @JsonProperty("can_copy_chat")
            var canCopyChat = false

            @JsonProperty("can_call")
            var canCall = false

            @JsonProperty("can_use_mass_mentions")
            var canUseMassMentions = false

            @JsonProperty("can_change_style")
            var canChangeStyle = false

            @JsonProperty("can_send_reactions")
            var canSendReactions = false

            @JsonProperty("can_change_stickers_popup_autoplay")
            var canChangeStickersPopupAutoplay = false
        }

        open class Permissions {
            @JsonProperty("invite")
            var invite: String? = null

            @JsonProperty("change_info")
            var changeInfo: String? = null

            @JsonProperty("change_pin")
            var changePin: String? = null

            @JsonProperty("use_mass_mentions")
            var useMassMentions: String? = null

            @JsonProperty("see_invite_link")
            var seeInviteLink: String? = null

            @JsonProperty("call")
            var call: String? = null

            @JsonProperty("change_admins")
            var changeAdmins: String? = null

            @JsonProperty("change_style")
            var changeStyle: String? = null
        }
    }

    open class CanWrite {
        @JsonProperty("allowed")
        var allowed = false
    }

    open class SortId {
        @JsonProperty("major_id")
        var majorId: Long = 0

        @JsonProperty("minor_id")
        var minorId: Long = 0
    }

    open class Peer {
        @JvmField
        @JsonProperty("id")
        var id: Long = 0

        @JsonProperty("type")
        var type: String? = null

        @JsonProperty("local_id")
        var localId: Long = 0
    }
}
