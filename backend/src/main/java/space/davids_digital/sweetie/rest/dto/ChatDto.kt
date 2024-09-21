package space.davids_digital.sweetie.rest.dto;

import java.util.List;

public record ChatDto(
        long peerId,
        String title,
        String pictureUrl,
        boolean botEnabled,
        String context,
        long gptMaxInputTokens,
        long gptMaxOutputTokens,
        double gptTemperature,
        double gptTopP,
        double gptFrequencyPenalty,
        double gptPresencePenalty,
        String gptModel,
        boolean processAudioMessages,
        List<String> availableGptModels
) {}
