package space.davids_digital.sweetie.rest.controller

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.*
import space.davids_digital.sweetie.orm.service.VkMessageOrmService
import space.davids_digital.sweetie.rest.dto.MessagesChartDto
import java.time.ZonedDateTime

@RestController
@RequestMapping("/chart")
class ChartController @Autowired constructor(private val vkMessageOrmService: VkMessageOrmService) {
    @GetMapping
    @ResponseBody
    fun getChart(
        @RequestParam("from")from: ZonedDateTime,
        @RequestParam(value = "to", required = false) to: ZonedDateTime?,
        @RequestParam(value = "peer_id_filter", required = false) peerIdFilter: Long?,
        @RequestParam(value = "from_id_filter", required = false) fromIdFilter: Long?,
        @RequestParam("aggregation_minutes") aggregationMinutes: Long
    ): MessagesChartDto {
        val safeTo = to ?: ZonedDateTime.now()
        val (_, _, _, _, _, labels, counts) = vkMessageOrmService.getChart(
            from,
            safeTo,
            peerIdFilter,
            fromIdFilter,
            aggregationMinutes
        )
        return MessagesChartDto(
            from,
            to,
            aggregationMinutes,
            peerIdFilter,
            fromIdFilter,
            labels,
            counts
        )
    }
}
