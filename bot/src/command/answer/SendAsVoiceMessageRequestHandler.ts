import {MetaRequestHandler} from "./MetaRequestHandler";
import {Context} from "../../Context";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export default class SendAsVoiceMessageRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === 'sendAsVoiceMessage';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (message.text == null) {
            response.metaRequestErrors.push("Can't generate audio: message has no text");
            return;
        }
        const audio = await this.context.ttsService.generateSpeech(response.text, "tts-1-hd", "shimmer");
        const attachment = await this.context.vkMessagesService.uploadVoiceMessage(message.peerId, audio);
        response.attachments = [attachment];
    }
}