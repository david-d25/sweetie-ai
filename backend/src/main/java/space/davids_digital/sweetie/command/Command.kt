package space.davids_digital.sweetie.command

import com.vk.api.sdk.objects.messages.Message

interface Command {
    fun getNames(): Array<String>
    fun getUsage(): String
    fun requiresChatAdmin(): Boolean
    fun requiresAppCeo(): Boolean
    suspend fun handle(commandName: String, rawArguments: String, message: Message)
}