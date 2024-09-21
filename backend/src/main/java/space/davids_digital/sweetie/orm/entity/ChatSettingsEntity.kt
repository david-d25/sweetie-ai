package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "chat_settings")
class ChatSettingsEntity {
    @Id
    @Column(name = "peer_id")
    var peerId: Long = 0

    @Column(name = "name", columnDefinition = "text")
    var name: String? = null

    @Column(name = "context", columnDefinition = "text")
    var context: String? = null

    @Column(name = "memory", columnDefinition = "text")
    var memory: String? = null

    @Column(name = "gpt_max_input_tokens")
    var gptMaxInputTokens = 0

    @Column(name = "gpt_max_output_tokens")
    var gptMaxOutputTokens = 0

    @Column(name = "gpt_temperature")
    var gptTemperature = 0.0

    @Column(name = "gpt_top_p")
    var gptTopP = 0.0

    @Column(name = "gpt_frequency_penalty")
    var gptFrequencyPenalty = 0.0

    @Column(name = "gpt_presence_penalty")
    var gptPresencePenalty = 0.0

    @Column(name = "bot_enabled")
    var botEnabled = false

    @Column(name = "gpt_model", columnDefinition = "text")
    var gptModel: String = ""

    @Column(name = "process_audio_messages")
    var processAudioMessages = false

    @Column(name = "tts_voice", columnDefinition = "text")
    var ttsVoice: String = ""

    @Column(name = "tts_speed")
    var ttsSpeed = 0.0
}
