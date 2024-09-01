package space.davids_digital.sweetie.orm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat_settings")
public class ChatSettingsEntity {
    @Id
    @Column(name = "peer_id")
    public long peerId;

    @Column(name = "name")
    public String name;

    @Column(name = "context")
    public String context;

    @Column(name = "memory")
    public String memory;

    @Column(name = "gpt_max_input_tokens")
    public int gptMaxInputTokens;

    @Column(name = "gpt_max_output_tokens")
    public int gptMaxOutputTokens;

    @Column(name = "gpt_temperature")
    public double gptTemperature;

    @Column(name = "gpt_top_p")
    public double gptTopP;

    @Column(name = "gpt_frequency_penalty")
    public double gptFrequencyPenalty;

    @Column(name = "gpt_presence_penalty")
    public double gptPresencePenalty;

    @Column(name = "bot_enabled")
    public boolean botEnabled;

    @Column(name = "gpt_model")
    public String gptModel;

    @Column(name = "process_audio_messages")
    public boolean processAudioMessages;
}
