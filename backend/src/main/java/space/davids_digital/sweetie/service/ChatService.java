package space.davids_digital.sweetie.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import space.davids_digital.sweetie.model.ChatSettingsModel;
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService;
import space.davids_digital.sweetie.rest.dto.ChatSettingsUpdateDto;
import space.davids_digital.sweetie.rest.exception.ResourceNotFoundException;
import space.davids_digital.sweetie.service.exception.ValidationException;

@Service
public class ChatService {
    private final OpenAiService openAiService;
    private final SessionService sessionService;
    private final ChatSettingsOrmService chatSettingsOrmService;

    @Autowired
    public ChatService(
            OpenAiService openAiService,
            SessionService sessionService,
            ChatSettingsOrmService chatSettingsOrmService
    ) {
        this.openAiService = openAiService;
        this.sessionService = sessionService;
        this.chatSettingsOrmService = chatSettingsOrmService;
    }

    @Transactional
    public ChatSettingsModel update(long id, ChatSettingsUpdateDto updates) {
        var session = sessionService.requireSession();
        var settings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId());
        if (settings == null) {
            throw new ResourceNotFoundException();
        }
        var newSettings = new ChatSettingsModel(
                settings.peerId(),
                settings.titleCached(),
                updates.context().orElse(settings.context()),
                updates.gptMaxInputTokens().orElse(settings.gptMaxInputTokens()),
                updates.gptMaxOutputTokens().orElse(settings.gptMaxOutputTokens()),
                updates.gptTemperature().orElse(settings.gptTemperature()),
                updates.gptTopP().orElse(settings.gptTopP()),
                updates.gptFrequencyPenalty().orElse(settings.gptFrequencyPenalty()),
                updates.gptPresencePenalty().orElse(settings.gptPresencePenalty()),
                updates.botEnabled().orElse(settings.botEnabled()),
                updates.gptModel().orElse(settings.gptModel()),
                updates.processAudioMessages().orElse(settings.processAudioMessages())
        );
        validateChatSettings(newSettings);
        return chatSettingsOrmService.save(newSettings);
    }

    public void validateChatSettings(ChatSettingsModel settings) {
        if (settings.context() != null && settings.context().length() > 2000) {
            throw new ValidationException("context is too big, max 2000 symbols");
        }
        if (settings.gptMaxInputTokens() < 0 || settings.gptMaxInputTokens() > 16384) {
            throw new ValidationException("gptMaxInputTokens must be in range [0, 16384]");
        }
        if (settings.gptMaxOutputTokens() < 1 || settings.gptMaxOutputTokens() > 2048) {
            throw new ValidationException("gptMaxOutputTokens must be in range [1, 2048]");
        }
        if (settings.gptTemperature() < 0 || settings.gptTemperature() > 2) {
            throw new ValidationException("gptTemperature must be in range [0, 2]");
        }
        if (settings.gptTopP() < 0 || settings.gptTopP() > 1) {
            throw new ValidationException("gptTopP must be in range [0, 1]");
        }
        if (settings.gptFrequencyPenalty() < 0 || settings.gptFrequencyPenalty() > 2) {
            throw new ValidationException("gptFrequencyPenalty must be in range [0, 2]");
        }
        if (settings.gptPresencePenalty() < 0 || settings.gptPresencePenalty() > 2) {
            throw new ValidationException("gptPresencePenalty must be in range [0, 2]");
        }
        if (!openAiService.getAvailableGptModels().contains(settings.gptModel())) {
            throw new ValidationException(
                    "gptModel must be one of [" + String.join(", ", openAiService.getAvailableGptModels()) + "]"
            );
        }
    }
}
