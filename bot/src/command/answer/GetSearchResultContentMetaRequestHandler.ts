import {MetaRequestHandler} from "./MetaRequestHandler";
import {Context} from "../../Context";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export default class GetSearchResultContentMetaRequestHandler implements MetaRequestHandler {
    constructor (private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'getSearchResultContent';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length == 0) {
            response.metaRequestErrors.push("Сладенький, ты не указал, что искать");
            return;
        }
        const metaphorDocumentId = request.args[0];
        console.log(`[${message.peerId}] Getting content from page id '${metaphorDocumentId}'`);
        const result = await this.context.metaphorService.getContent(metaphorDocumentId);
        response.metaRequestResults.push(`Content from page id '${metaphorDocumentId}':\n"""\n${result}\n"""`);
    }
}