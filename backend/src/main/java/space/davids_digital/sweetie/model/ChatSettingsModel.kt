package space.davids_digital.sweetie.model

data class ChatSettingsModel(
    val peerId: Long,
    val titleCached: String?,
    val context: String,
    val gptMaxInputTokens: Int,
    val gptMaxOutputTokens: Int,
    val gptTemperature: Double,
    val gptTopP: Double,
    val gptFrequencyPenalty: Double,
    val gptPresencePenalty: Double,
    val botEnabled: Boolean,
    val gptModel: String,
    val processAudioMessages: Boolean,
    val ttsVoice: String,
    val ttsSpeed: Double,
)
