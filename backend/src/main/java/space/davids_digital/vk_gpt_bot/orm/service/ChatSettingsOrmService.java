package space.davids_digital.vk_gpt_bot.orm.service;

import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.model.ChatSettingsModel;
import space.davids_digital.vk_gpt_bot.orm.entity.ChatSettingsEntity;
import space.davids_digital.vk_gpt_bot.orm.repository.ChatSettingsRepository;

import java.util.Collection;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ChatSettingsOrmService {
    private final ChatSettingsRepository repository;

    public ChatSettingsOrmService(ChatSettingsRepository repository) {
        this.repository = repository;
    }

    public Collection<ChatSettingsModel> findHavingAdmin(long adminId) {
        return repository.findHavingAdmin(adminId).stream().map(this::toModel).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    public ChatSettingsModel findByIdAndHavingAdmin(long peerId, long adminId) {
        return toModel(repository.findByIdAndHavingAdmin(peerId, adminId));
    }

    public ChatSettingsModel save(ChatSettingsModel model) {
        return toModel(repository.save(toEntity(model)));
    }

    private ChatSettingsEntity toEntity(ChatSettingsModel model) {
        var entity = new ChatSettingsEntity();
        entity.peerId = model.peerId();
        entity.name = model.titleCached();
        entity.context = model.context();
        entity.gptMaxInputTokens = model.gptMaxInputTokens();
        entity.gptMaxOutputTokens = model.gptMaxOutputTokens();
        entity.gptTemperature = model.gptTemperature();
        entity.gptTopP = model.gptTopP();
        entity.gptFrequencyPenalty = model.gptFrequencyPenalty();
        entity.gptPresencePenalty = model.gptPresencePenalty();
        entity.botEnabled = model.botEnabled();
        entity.gptModel = model.gptModel();
        return entity;
    }

    private ChatSettingsModel toModel(ChatSettingsEntity entity) {
        if (entity == null) {
            return null;
        }
        return new ChatSettingsModel(
                entity.peerId,
                entity.name,
                entity.context,
                entity.gptMaxInputTokens,
                entity.gptMaxOutputTokens,
                entity.gptTemperature,
                entity.gptTopP,
                entity.gptFrequencyPenalty,
                entity.gptPresencePenalty,
                entity.botEnabled,
                entity.gptModel
        );
    }
}
