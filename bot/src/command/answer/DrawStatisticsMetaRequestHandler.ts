import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";
import axios from "axios";

export default class DrawStatisticsMetaRequestHandler implements MetaRequestHandler {
    private backendUrl!: string;

    constructor(private context: Context) {
        context.onReady(() => this.init());
    }

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'drawStatistics';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        const fromTimestamp = +request.args[0] || 0;
        const toTimestamp = +request.args[1] || Date.now()/1000;
        // const userIdsFilter = request.args[2] == undefined ? [] : JSON.parse(request.args[2]);
        // const type = request.args[3];
        const imageBuffer = await this.createChartImage(message.peerId, fromTimestamp, toTimestamp);
        const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [imageBuffer]);
        response.attachments.push(...attachments);
    }

    private init() {
        this.backendUrl = this.context.configService.requireEnv('BACKEND_URL');
    }

    private async createChartImage(
        peerId: number,
        fromTimestamp: number,
        toTimestamp: number
    ): Promise<Buffer> {
        const from = new Date(fromTimestamp * 1000).toISOString();
        const to = new Date(toTimestamp * 1000).toISOString();
        const url = `http://${this.backendUrl}/charts/line-aggregate?peerId=${peerId}&from=${from}&to=${to}`;
        console.log(`[${peerId}] Requesting chart image from ${url}`);
        const response = await axios.get(url, {responseType: 'arraybuffer'});
        return Buffer.from(response.data);
    }
}