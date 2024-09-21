package space.davids_digital.sweetie.rest.dto

data class ChatDto(
    val peerId: Long,
    val title: String?,
    val pictureUrl: String?,
    val botEnabled: Boolean,
    val context: String,
    val gptMaxInputTokens: Long,
    val gptMaxOutputTokens: Long,
    val gptTemperature: Double,
    val gptTopP: Double,
    val gptFrequencyPenalty: Double,
    val gptPresencePenalty: Double,
    val gptModel: String,
    val processAudioMessages: Boolean,
    val availableGptModels: List<String>
)
