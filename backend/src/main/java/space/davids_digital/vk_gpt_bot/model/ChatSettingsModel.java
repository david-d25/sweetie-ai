package space.davids_digital.vk_gpt_bot.model;

public record ChatSettingsModel(
        long peerId,
        String titleCached,
        String context,
        int gptMaxInputTokens,
        int gptMaxOutputTokens,
        double gptTemperature,
        double gptTopP,
        double gptFrequencyPenalty,
        double gptPresencePenalty,
        boolean botEnabled,
        String gptModel
) {}
