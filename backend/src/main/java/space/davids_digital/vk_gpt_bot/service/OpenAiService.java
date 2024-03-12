package space.davids_digital.vk_gpt_bot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.integration.openai.OpenAiApiService;

import java.util.List;

@Service
public class OpenAiService {
    private final OpenAiApiService api;

    @Autowired
    public OpenAiService(OpenAiApiService openAiApiService) {
        this.api = openAiApiService;
    }

    public List<String> getAvailableGptModels() {
        return api.getAvailableModels().stream().filter(it -> it.matches("(^gpt|^ft:gpt).*")).toList();
    }
}
