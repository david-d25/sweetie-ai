package space.davids_digital.sweetie.model

import java.time.Instant

data class DeferredVkMessageModel (
    val id: Int,
    val peerId: Long,
    val sendAt: Instant,
    val text: String
)