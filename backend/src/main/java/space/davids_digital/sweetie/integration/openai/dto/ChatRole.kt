package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.Serializable

@JvmInline
@Serializable
value class ChatRole(val role: String) {
    companion object {
        val System = ChatRole("system")
        val User = ChatRole("user")
        val Assistant = ChatRole("assistant")
        val Tool = ChatRole("tool")
    }
}
