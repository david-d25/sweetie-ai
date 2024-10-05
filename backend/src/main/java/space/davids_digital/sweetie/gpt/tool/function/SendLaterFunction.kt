package space.davids_digital.sweetie.gpt.tool.function

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.service.DeferredVkMessageService

@Component
class SendLaterFunction(
    private val deferredVkMessageService: DeferredVkMessageService
): AssistantFunction<SendLaterFunction.SendLaterParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(SendLaterFunction::class.java)
    }

    data class SendLaterParameters(
        @Description("Message to send")
        val message: String,
        @Description("Delay in seconds")
        val delaySeconds: Long
    )

    override fun getName() = "schedule_message"
    override fun getDescription() = "Send a message later"
    override fun getParametersClass() = SendLaterParameters::class

    override suspend fun call(
        parameters: SendLaterParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext
    ): String {
        if (parameters.message.isBlank()) {
            return "Message should not be empty"
        }
        if (parameters.delaySeconds <= 0) {
            return "Delay should be greater than 0"
        }
        deferredVkMessageService.scheduleMessage(message.peerId, parameters.message, parameters.delaySeconds)
        log.info("Scheduled message to ${message.peerId} in ${parameters.delaySeconds} seconds")
        return "Message scheduled"
    }
}