package space.davids_digital.sweetie.command

import space.davids_digital.sweetie.model.VkMessageModel

interface Command {
    fun getNames(): Array<String>
    fun getUsage(): String
    fun requiresChatAdmin(): Boolean
    fun requiresAppCeo(): Boolean
    suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel)
}