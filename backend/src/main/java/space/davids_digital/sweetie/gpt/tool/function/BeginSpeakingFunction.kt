package space.davids_digital.sweetie.gpt.tool.function

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class BeginSpeakingFunction: AssistantFunction<BeginSpeakingFunction.SpeakParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(BeginSpeakingFunction::class.java)
    }

    data class SpeakParameters (
        @Description("Notes")
        val notes: String? = null
    )

    override fun getName() = "begin_speaking"
    override fun getParametersClass() = SpeakParameters::class
    override fun getDescription() = """
        Enables your ability to output audio, you will be able to output voice as well as text.
        Due to technical limitations, you won't be able to see images in speaking mode, that's why you may use
        'notes' parameter to write notes to yourself if needed.
        In speaking mode, you can't send other attachments, only text and voice.
    """.trimIndent()

    override fun isVisible(message: VkMessageModel, invocationContext: InvocationContext): Boolean {
        return !invocationContext.voiceModeRequested()
    }

    override suspend fun call(
        parameters: SpeakParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext
    ): String {
        log.info("Requested voice mode")
        invocationContext.requestVoiceMode()
        return "Voice enabled! Now you can output audio. " +
                if (parameters.notes?.isNotBlank() == true) "Your notes: '${parameters.notes}'" else ""
    }
}