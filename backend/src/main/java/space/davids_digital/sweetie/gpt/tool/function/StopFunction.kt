package space.davids_digital.sweetie.gpt.tool.function

import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class StopFunction: AssistantFunction<Unit> {
    override fun getName() = "stop"
    override fun getParametersClass() = Unit::class
    override fun isVisible(message: VkMessageModel, invocationContext: InvocationContext) = false

    override fun getDescription() = """
        Ends current conversation.
        You're supposed to call this if you feel you don't have anything else to say, 
        e.g. when user replies to your message, but talks to someone else.
    """.trimIndent()

    override suspend fun call(parameters: Unit, message: VkMessageModel, invocationContext: InvocationContext): String {
        invocationContext.requestStop()
        return "Conversation end requested."
    }
}