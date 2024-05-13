import {MetaRequestHandler} from "./MetaRequestHandler";
import {Context} from "../../Context";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export default class SendAsAudioMessageRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === 'audioMessage';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length === 0) {
            response.metaRequestResults.push("SYSTEM: 'sendAsVoiceMessage' requires text argument");
            return;
        }
        const chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        await this.context.vkMessagesService.indicateActivity(message.peerId, "audiomessage");
        try {
            const audio = await this.context.audioService.generateSpeech(
                request.args.join(" "),
                "tts-1-hd",
                chatSettings.ttsVoice,
                chatSettings.ttsSpeed
            );
            const attachment = await this.context.vkMessagesService.uploadVoiceMessage(message.peerId, audio);
            response.attachments = [attachment];
        } catch (e) {
            console.error(e);
            response.metaRequestResults.push("SYSTEM: 'sendAsVoiceMessage' failed: " + e);
        }
    }
}