package space.davids_digital.sweetie.orm.entity

import java.io.Serializable

data class ChatAdminEntityId(
    var peerId: Long = 0,
    var userId: Long = 0
) : Serializable {
    constructor(): this(0, 0)
}
