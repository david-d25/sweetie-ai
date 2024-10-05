package space.davids_digital.sweetie.rest.dto

import java.util.*

data class ChatSettingsUpdateDto(
    val botEnabled: Optional<Boolean>,
    val context: Optional<String>,
    val gptMaxInputTokens: Optional<Int>,
    val gptMaxOutputTokens: Optional<Int>,
    val gptTemperature: Optional<Double>,
    val gptTopP: Optional<Double>,
    val gptFrequencyPenalty: Optional<Double>,
    val gptPresencePenalty: Optional<Double>,
    val gptModel: Optional<String>,
    val processAudioMessages: Optional<Boolean>,
    val ttsVoice: Optional<String>,
    val ttsSpeed: Optional<Double>
)
