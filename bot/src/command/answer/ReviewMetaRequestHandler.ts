import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export default class ReviewMetaRequestHandler implements MetaRequestHandler {
    canYouHandleThis(requestName: string): boolean {
        return requestName == 'review';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        console.log(`[${message.peerId}] Reviewing response: ${response.text}`)
        response.metaRequestResults.push(
            `SYSTEM: You called 'review', here is your previous response:\n
            \`\`\`\n
            ${response.text}\n
            \`\`\`\n
            Please, review it and write your final response.`
        );
    }

}