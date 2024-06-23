import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";

export default class SpeakFunction implements AssistantFunction {
    constructor(private context: Context) {}

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const text = args['text'];
        const chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        await this.context.vkMessagesService.indicateActivity(message.peerId, "audiomessage");
        const audio = await this.context.audioService.generateSpeech(
            text,
            "tts-1-hd",
            chatSettings.ttsVoice,
            chatSettings.ttsSpeed
        );
        const attachment = await this.context.vkMessagesService.uploadVoiceMessage(message.peerId, audio);
        invocationContext.addAttachment(attachment);
        return "Audio message is attached";
    }

    getDescription(): string {
        return "Attach an audio message. " +
            "Use this to speak with voice. " +
            "Prefer to speak with voice with people who also speak with voice messages. " +
            "Audio messages can't have other attachments, don't mix with 'draw'.";
    }

    getName(): string {
        return "speak";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                text: {
                    type: "string",
                    description: "Text to speak"
                }
            },
            required: ["text"]
        };
    }

}