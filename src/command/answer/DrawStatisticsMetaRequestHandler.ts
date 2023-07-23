import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";
// import {ChartJSNodeCanvas} from "chartjs-node-canvas";
// import {ChartConfiguration} from "chart.js";
import {createCanvas} from "canvas";

export default class DrawStatisticsMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'drawStatistics';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        const imageBuffer = await this.createChartImage();
        const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [imageBuffer]);
        response.attachments.push(...attachments);
    }

    private async createChartImage(): Promise<Buffer> {
        const width = 800;
        const height = 600;
        // const chatJsNodeCanvas = new ChartJSNodeCanvas({ width, height });
        // const data = {
        //     datasets: [{
        //         label: 'My First Dataset',
        //         data: [65, 59, 80, 81, 56, 55, 40],
        //         fill: false,
        //         borderColor: 'rgb(75, 192, 192)',
        //         tension: 0.1
        //     }]
        // };
        // const config: ChartConfiguration<'line', number[], string> = { type: 'line', data };
        // return await chatJsNodeCanvas.renderToBuffer(config);
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        context.fillStyle = 'green';
        context.fillRect(10, 10, width - 20, height - 20);
        return canvas.toBuffer();
    }
}