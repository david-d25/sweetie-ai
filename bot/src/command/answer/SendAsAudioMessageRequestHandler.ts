import {MetaRequestHandler} from "./MetaRequestHandler";
import {Context} from "../../Context";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export default class SendAsAudioMessageRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === 'sendAsAudioMessage';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (response.text == null) {
            console.error(`[${message.peerId}] 'sendAsVoiceMessage' failed: Can't generate audio: message has no text`)
            response.metaRequestResults.push("SYSTEM: 'sendAsVoiceMessage' failed: First type your text, and then call this function!");
            return;
        }
        const chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        await this.context.vkMessagesService.indicateActivity(message.peerId, "audiomessage");
        try {
            const audio = await this.context.audioService.generateSpeech(
                response.text,
                "tts-1-hd",
                chatSettings.ttsVoice,
                chatSettings.ttsSpeed
            );
            const attachment = await this.context.vkMessagesService.uploadVoiceMessage(message.peerId, audio);
            response.attachments = [attachment];
            if (!chatSettings.addTranscriptToVoice) {
                response.text = '';
            }
        } catch (e) {
            console.error(e);
            response.metaRequestResults.push("SYSTEM: 'sendAsVoiceMessage' failed: " + e);
        }
    }
}