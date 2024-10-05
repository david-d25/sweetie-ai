package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.SetActivityType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class SpeakFunction(
    private val chatSettingsService: ChatSettingsService,
    private val vkMessageService: VkMessageService,
    private val openAiService: OpenAiService
): AssistantFunction<SpeakFunction.SpeakParameters> {
    data class SpeakParameters (
        @Description("Text to speak")
        val text: String
    )

    override fun getName() = "speak"
    override fun getParametersClass() = SpeakParameters::class
    override fun getDescription() = """
        Attach an audio message.
        Use this to speak with voice.
        Prefer to speak with voice with people who also speak with voice messages.
        Audio messages can't have other attachments, don't mix with 'draw'.
    """.trimIndent()

    override suspend fun call(
        parameters: SpeakParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext
    ): String {
        val chatSettings = withContext(Dispatchers.IO) {
            chatSettingsService.getOrCreateDefault(message.peerId)
        }
        vkMessageService.indicateActivity(message.peerId, SetActivityType.AUDIOMESSAGE)
        val audio = openAiService.speech(parameters.text, "tts-1-hd", chatSettings.ttsVoice, chatSettings.ttsSpeed)
        val attachment = vkMessageService.uploadVoiceMessageAttachment(message.peerId, audio)
        invocationContext.addAttachment(attachment)
        return "Audio message is attached."
    }
}