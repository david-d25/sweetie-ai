import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";

export default class WebSearchRequestHandler implements MetaRequestHandler {
    constructor(public context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'webSearch';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length == 0) {
            response.metaRequestErrors.push("Сладенький, ты не указал, что искать");
            return;
        }
        const query = request.args[0];
        let numResults = +request.args[1] || 3;
        if (isNaN(numResults))
            numResults = 3;
        if (numResults < 1)
            numResults = 1;
        if (numResults > 10)
            numResults = 10;

        console.log(`[${message.peerId}] Searching for '${query}' with ${numResults} results`);

        const results = await this.context.metaphorService.search(query, numResults);
        response.metaRequestResults.push(`Result of 'webSearch':\n"""\n${JSON.stringify(results)}\n"""`);
    }
}