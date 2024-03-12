package space.davids_digital.vk_gpt_bot.rest.dto;

import java.util.Optional;

public record ChatSettingsUpdateDto(
        Optional<Boolean> botEnabled,
        Optional<String> context,
        Optional<Integer> gptMaxInputTokens,
        Optional<Integer> gptMaxOutputTokens,
        Optional<Double> gptTemperature,
        Optional<Double> gptTopP,
        Optional<Double> gptFrequencyPenalty,
        Optional<Double> gptPresencePenalty,
        Optional<String> gptModel
) {}
