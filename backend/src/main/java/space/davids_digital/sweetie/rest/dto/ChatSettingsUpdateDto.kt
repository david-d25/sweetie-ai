package space.davids_digital.sweetie.rest.dto

import java.util.*

data class ChatSettingsUpdateDto(
    val botEnabled: Optional<Boolean> = Optional.empty(),
    val context: Optional<String> = Optional.empty(),
    val gptMaxInputTokens: Optional<Int> = Optional.empty(),
    val gptMaxOutputTokens: Optional<Int> = Optional.empty(),
    val gptTemperature: Optional<Double> = Optional.empty(),
    val gptTopP: Optional<Double> = Optional.empty(),
    val gptFrequencyPenalty: Optional<Double> = Optional.empty(),
    val gptPresencePenalty: Optional<Double> = Optional.empty(),
    val gptModel: Optional<String> = Optional.empty(),
    val processAudioMessages: Optional<Boolean> = Optional.empty(),
    val ttsVoice: Optional<String> = Optional.empty(),
    val ttsSpeed: Optional<Double> = Optional.empty()
)
