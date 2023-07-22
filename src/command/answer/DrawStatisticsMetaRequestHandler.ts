import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";

export default class DrawStatisticsMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'drawStatistics';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        response.metaRequestResults.push("System: Tell user that statistics functionality is not implemented yet. Tag David and ask it to hurry up implementing it.")
    }
}