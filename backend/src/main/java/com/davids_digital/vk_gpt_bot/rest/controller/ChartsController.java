package com.davids_digital.vk_gpt_bot.rest.controller;

import com.davids_digital.vk_gpt_bot.service.ChartService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;

@RestController
@RequestMapping("/charts")
public class ChartsController {
    private final ChartService chartService;

    public ChartsController(ChartService chartService) {
        this.chartService = chartService;
    }

    @ResponseBody
    @GetMapping(value = "line-aggregate", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] lineAggregate(
            @RequestParam long peerId,
            @RequestParam(defaultValue = "1970-01-01T00:00:00Z") @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") Instant from,
            @RequestParam(defaultValue = "9999-12-31T23:59:59Z") @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") Instant to
    ) throws IOException {
        var image = chartService.getAggregateLineChart(peerId, from, to);
        var stream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", stream);
        return stream.toByteArray();
    }
}
