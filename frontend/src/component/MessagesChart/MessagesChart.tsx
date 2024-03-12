import React, {useEffect, useRef, useState} from "react";

import s from "./MessagesChart.scss";
import LoadingContent, {LoadingContentStatus} from "../LoadingContent/LoadingContent";
import {Chart, Plugin, TooltipItem} from "chart.js/auto";
import api from "../../api";
import AnimateHeight from "react-animate-height";
import ErrorMessage from "../ErrorMessage/ErrorMessage";

interface MessagesChartProps {
    peerIdFilter?: number,
    fromIdFilter?: number
}

interface ChartData {
    from: Date,
    to: Date | null,
    aggregationPeriodMinutes: number,
    peerIdFilter: number | null,
    fromIdFilter: number | null,
    labels: number[],
    counts: number[]
}

interface ChartApiResponse {
    from: number,
    to: number | null,
    aggregationPeriodMinutes: number,
    peerIdFilter: number | null,
    fromIdFilter: number | null,
    labels: number[],
    counts: number[]
}

const noDataPlugin: Plugin = {
    id: 'noDataPlugin',
    afterDraw: function(chart: Chart) {
        if (
            chart.data.datasets.length === 0 ||
            chart.data.datasets.every((dataset: any) => dataset.data.length === 0)
        ) {
            let ctx = chart.ctx;
            let width = chart.width;
            let height = chart.height;
            chart.clear();

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = "grey";
            ctx.font = "20px sans-serif";
            ctx.fillText("Нет данных", width / 2, height / 2);
            ctx.restore();
        }
    }
};

Chart.register(noDataPlugin);

const scales = [
    {
        title: "365 д.",
        aggregationPeriodMinutes: 10080,
        getFrom: () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    },
    {
        title: "30 д.",
        aggregationPeriodMinutes: 1440,
        getFrom: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
        title: "7 д.",
        aggregationPeriodMinutes: 1440,
        getFrom: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
        title: "1 д.",
        aggregationPeriodMinutes: 60,
        getFrom: () => new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
        title: "1 ч.",
        aggregationPeriodMinutes: 5,
        getFrom: () => new Date(Date.now() - 60 * 60 * 1000),
    },
];

export default function MessagesChart(props: MessagesChartProps) {
    const [loading, setLoading] = useState(LoadingContentStatus.LOADING);
    const [chartState, setChartState] = useState<ChartData>(null);
    const [selectedScale, setSelectedScale] = useState(2);
    const [showError, setShowError] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scalesContainerRef = useRef<HTMLDivElement>(null);
    const chart = useRef<Chart>(null);

    useEffect(() => {
        if (scalesContainerRef.current) {
            const scale: HTMLDivElement = scalesContainerRef.current.querySelector(
                `[data-scale-index="${selectedScale}"]`
            );
            if (scale) {
                scalesContainerRef.current.scrollTo({
                    top: 0,
                    left: scale.offsetLeft - scalesContainerRef.current.clientWidth/2 - scale.offsetWidth/2,
                    behavior: 'smooth'
                });
            }
        }
        const from = encodeURIComponent(scales[selectedScale].getFrom().toISOString())
        const aggregation = scales[selectedScale].aggregationPeriodMinutes;
        let url = `/chart?from=${from}&aggregation_minutes=${aggregation}`;
        if (props.peerIdFilter) {
            url += `&peer_id_filter=${props.peerIdFilter}`;
        }
        if (props.fromIdFilter) {
            url += `&from_id_filter=${props.fromIdFilter}`;
        }
        api.get(url).then(response => {
            setChartState(prepareChartData(response.data));
            setLoading(LoadingContentStatus.READY);
            setShowError(false);
        }).catch(error => {
            setShowError(true);
            console.error(error);
        });
    }, [selectedScale]);

    useEffect(() => {
        if (!chart.current) {
            initChart();
        } else {
            chart.current.data.labels = chartState.labels;
            chart.current.data.datasets[0].data = chartState.counts;
            chart.current.options.plugins.tooltip.callbacks.title = function (items: TooltipItem<any>[]): string {
                return formatTooltipTitle(new Date(+items[0].label * 1000));
            }
            chart.current.update();
        }
    }, [chartState]);

    function initChart() {
        if (!canvasRef.current)
            return;
        chart.current = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                labels: chartState.labels,
                datasets: [
                    {
                        cubicInterpolationMode: 'monotone',
                        data: chartState.counts,
                        fill: "start"
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            title(items: TooltipItem<any>[]): string {
                                return formatTooltipTitle(new Date(+items[0].label * 1000));
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'category',
                        ticks: {
                            autoSkip: true,
                            autoSkipPadding: 10,
                            maxRotation: 0,
                            callback(value: number): string {
                                return formatTickDate(new Date(+this.getLabelForValue(value) * 1000));
                            }
                        },
                        grid: {
                            color: 'rgba(127, 127, 127, 0.2)',
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(127, 127, 127, 0.2)',
                        }
                    }
                }
            },
        });
    }

    function formatTickDate(date: Date): string {
        let day = '' + date.getDate();
        let month = '' + (date.getMonth() + 1);
        let year = date.getFullYear();
        if (day.length < 2) day = '0' + day;
        if (month.length < 2) month = '0' + month;

        let hour = '' + date.getHours();
        let minute = '' + date.getMinutes();
        if (hour.length < 2) hour = '0' + hour;
        if (minute.length < 2) minute = '0' + minute;

        let result = '';

        const today = new Date().toDateString() === date.toDateString();
        if (!today) {
            result = [day, month, year].join('.');
        }

        if (date.getHours() != 0 || date.getMinutes() != 0 || today) {
            result += ' ' + [hour, minute].join(':');
        }

        return result;
    }

    function formatTooltipTitle(date: Date): string {
        const nextTickDate = new Date(date.getTime() + chartState.aggregationPeriodMinutes * 60 * 1000);
        return `${formatTickDate(date)} - ${formatTickDate(nextTickDate)}`;
    }

    function prepareChartData(data: ChartApiResponse): ChartData {
        return {
            from: new Date(data.from * 1000),
            to: new Date(data.to * 1000),
            aggregationPeriodMinutes: data.aggregationPeriodMinutes,
            peerIdFilter: data.peerIdFilter,
            fromIdFilter: data.fromIdFilter,
            labels: data.labels.concat(Date.now()/1000),
            counts: data.counts
        };
    }

    return (
        <div className={s.messagesChart}>
            <LoadingContent status={loading}>
                <AnimateHeight height={showError ? 'auto' : 0}>
                    <ErrorMessage message="Не получилось загрузить график"/>
                </AnimateHeight>
                <canvas className={s.canvas} ref={canvasRef}></canvas>
                <div className={s.scales} ref={scalesContainerRef}>
                    { scales.map((scale, i) => (
                        <div key={i}
                             className={`${s.scale} ${i == selectedScale ? s.selectedScale : ''}`}
                             data-scale-index={i}
                             onClick={() => setSelectedScale(i)}>
                            {scale.title}
                        </div>
                    ))}
                </div>
            </LoadingContent>
        </div>
    );
}