package space.davids_digital.sweetie.integration.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import space.davids_digital.sweetie.integration.openai.dto.ModelDto;

import java.util.List;

@Service
public class OpenAiApiService {
    private static final Logger log = LoggerFactory.getLogger(OpenAiApiService.class);

    private final String openaiSecretKey;
    private final RestTemplate restTemplate;

    @Autowired
    public OpenAiApiService(
            @Qualifier("openaiSecretKey") String openaiSecretKey,
            RestTemplate restTemplate
    ) {
        this.openaiSecretKey = openaiSecretKey;
        this.restTemplate = restTemplate;
    }

    @Cacheable("OpenAiApiService.getAvailableModels")
    public List<String> getAvailableModels() {
        log.info("OpenAI API call: GET /v1/models");
        var url = "https://api.openai.com/v1/models";
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openaiSecretKey);
        var requestEntity = new HttpEntity<>(headers);
        var responseEntity = restTemplate.exchange(url, HttpMethod.GET, requestEntity, GetModelsResponse.class);
        var response = responseEntity.getBody();
        if (response == null) {
            throw new RuntimeException("OpenAI API response is empty");
        }
        return response.data.stream().map(m -> m.id).toList();
    }

    private static class GetModelsResponse {
        @JsonProperty("data")
        List<ModelDto> data;
    }
}
