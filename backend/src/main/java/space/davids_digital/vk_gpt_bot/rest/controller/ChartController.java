package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import space.davids_digital.vk_gpt_bot.model.MessagesChartModel;
import space.davids_digital.vk_gpt_bot.orm.service.VkMessagesOrmService;
import space.davids_digital.vk_gpt_bot.rest.dto.MessagesChartDto;

import java.time.ZonedDateTime;

@RestController
@RequestMapping("/chart")
public class ChartController {
    private final VkMessagesOrmService vkMessagesOrmService;

    @Autowired
    public ChartController(VkMessagesOrmService vkMessagesOrmService) {
        this.vkMessagesOrmService = vkMessagesOrmService;
    }

    @GetMapping
    @ResponseBody
    public MessagesChartDto getChart(
            @RequestParam("from")
            ZonedDateTime from,
            @RequestParam(value = "to", required = false)
            ZonedDateTime to,
            @RequestParam(value = "peer_id_filter", required = false)
            Long peerIdFilter,
            @RequestParam(value = "from_id_filter", required = false)
            Long fromIdFilter,
            @RequestParam("aggregation_minutes")
            long aggregationMinutes
    ) {
        var safeTo = to == null ? ZonedDateTime.now() : to;
        MessagesChartModel model = vkMessagesOrmService.getChart(
                from,
                safeTo,
                peerIdFilter,
                fromIdFilter,
                aggregationMinutes
        );
        return new MessagesChartDto(
                from,
                to,
                aggregationMinutes,
                peerIdFilter,
                fromIdFilter,
                model.labels(),
                model.counts()
        );
    }
}
