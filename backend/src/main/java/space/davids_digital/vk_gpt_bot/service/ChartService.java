package space.davids_digital.vk_gpt_bot.service;

import space.davids_digital.vk_gpt_bot.model.VkMessageModel;
import space.davids_digital.vk_gpt_bot.orm.service.VkMessagesOrmService;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.axis.DateAxis;
import org.jfree.chart.axis.NumberAxis;
import org.jfree.chart.renderer.xy.StandardXYBarPainter;
import org.jfree.chart.renderer.xy.XYBarRenderer;
import org.jfree.data.time.*;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.*;

@Service
public class ChartService {
    private static final Font LABEL_FONT = new Font("Arial", Font.PLAIN, 24);
    private static final Font TICK_FONT = new Font("Arial", Font.PLAIN, 16);
    private final VkMessagesOrmService vkMessagesOrmService;

    public ChartService(VkMessagesOrmService vkMessagesOrmService) {
        this.vkMessagesOrmService = vkMessagesOrmService;
    }

    public BufferedImage getAggregateLineChart(long peerId, Instant from, Instant to) {
        var messages = vkMessagesOrmService.getMessagesByTime(peerId, from, to);
        var data = prepareDataPoints(messages, 60 * 60 * 24);
        var series = new TimeSeries("Все сообщения");
        for (var dataPoint : data) {
            series.addOrUpdate(new Day(Date.from(dataPoint.timestamp)), dataPoint.value);
        }
        var dataset = new TimeSeriesCollection();
        dataset.addSeries(series);
        var dateAxis = new DateAxis("Дата");
        dateAxis.setDateFormatOverride(new SimpleDateFormat("dd.MM.yyyy", new Locale("ru")));
        dateAxis.setLowerMargin(0);
        dateAxis.setUpperMargin(0);
        dateAxis.setLabelFont(LABEL_FONT);
        dateAxis.setTickLabelFont(TICK_FONT);
        var valueAxis = new NumberAxis("Все сообщения");
        valueAxis.setLabelFont(LABEL_FONT);
        valueAxis.setTickLabelFont(TICK_FONT);

        var chart = ChartFactory.createXYBarChart(null, "Дата", true, "Все сообщения", dataset);
        chart.removeLegend();
        var plot = chart.getXYPlot();
        var renderer = new XYBarRenderer();
        var barPainter = new StandardXYBarPainter();
        plot.setRenderer(renderer);
        plot.setDomainAxis(dateAxis);
        plot.setRangeAxis(valueAxis);
        plot.setBackgroundPaint(Color.WHITE);
        plot.setOutlinePaint(new Color(200, 200, 200));
        plot.setDomainGridlinePaint(new Color(240, 240, 240));
        plot.setDomainGridlineStroke(new BasicStroke(1));
        plot.setRangeGridlinePaint(new Color(240, 240, 240));
        plot.setRangeGridlineStroke(new BasicStroke(1));
        renderer.setSeriesPaint(0, new Color(0, 150, 0));
        renderer.setSeriesStroke(0, new BasicStroke(3));
        renderer.setShadowVisible(false);
        renderer.setBarPainter(barPainter);

        return chart.createBufferedImage(1280, 720);
    }

    private List<DataPoint> prepareDataPoints(Collection<VkMessageModel> messages, long quantizationSeconds) {
        var map = new TreeMap<Instant, DataPoint>();
        var minTimestamp = messages.stream().map(VkMessageModel::getTimestamp).findAny().orElse(Instant.now());
        var maxTimestamp = messages.stream().map(VkMessageModel::getTimestamp).findAny().orElse(Instant.now());
        for (var message : messages) {
            var rawEpochSecond = message.getTimestamp().getEpochSecond();
            var time = Instant.ofEpochSecond(rawEpochSecond - rawEpochSecond % quantizationSeconds);
            var dataPoint = map.get(time);
            if (dataPoint == null) {
                dataPoint = new DataPoint();
                dataPoint.timestamp = time;
                dataPoint.value = 0;
                map.put(time, dataPoint);
            }
            dataPoint.value += 1;
            if (time.isBefore(minTimestamp)) {
                minTimestamp = time;
            }
            if (time.isAfter(maxTimestamp)) {
                maxTimestamp = time;
            }
        }
        // fill gaps
        var currentTimestamp = Instant.ofEpochSecond(minTimestamp.getEpochSecond() - minTimestamp.getEpochSecond() % quantizationSeconds);
        while (currentTimestamp.isBefore(maxTimestamp)) {
            if (!map.containsKey(currentTimestamp)) {
                var dataPoint = new DataPoint();
                dataPoint.timestamp = currentTimestamp;
                dataPoint.value = 0;
                map.put(currentTimestamp, dataPoint);
            }
            currentTimestamp = currentTimestamp.plus(quantizationSeconds, ChronoUnit.SECONDS);
        }
        return map.values().stream().toList();
    }

    private static class DataPoint {
        public Instant timestamp;
        public double value;
    }
}
