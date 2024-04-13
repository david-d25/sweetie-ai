import ChatSettingsOrmService from "../orm/ChatSettingsOrmService";
import {Context} from "../Context";

export type ChatSettingsModel = {
    botEnabled: boolean,
    processAudioMessages: boolean,
    nameCached: string | null,
    context: string | null,
    memory: string | null,
    gptModel: string,
    gptMaxOutputTokens: number,
    gptMaxInputTokens: number,
    gptTemperature: number,
    gptTopP: number,
    gptFrequencyPenalty: number,
    gptPresencePenalty: number
}

export default class ChatSettingsService {
    private chatSettingsOrmService!: ChatSettingsOrmService
    constructor(private context: Context) {
        context.onReady(() => {
            this.chatSettingsOrmService = context.chatSettingsOrmService
        })
    }

    async getSettingsOrCreateDefault(peerId: number): Promise<ChatSettingsModel> {
        return await this.chatSettingsOrmService.getSettings(peerId)
            || await this.chatSettingsOrmService.createDefaultSettings(peerId);
    }

    async saveSettings(peerId: number, settings: ChatSettingsModel) {
        return await this.chatSettingsOrmService.saveSettings(peerId, settings)
    }

    async setBotEnabled(peerId: number, botEnabled: boolean) {
        return await this.changeSettings(peerId, model => model.botEnabled = botEnabled)
    }

    async setName(peerId: number, name: string | null) {
        return await this.changeSettings(peerId, model => model.nameCached = name)
    }

    async setContext(peerId: number, context: string | null) {
        return await this.changeSettings(peerId, model => model.context = context)
    }

    async setMemory(peerId: number, memory: string | null) {
        return await this.changeSettings(peerId, model => model.memory = memory)
    }

    async setGptModel(peerId: number, gptModel: string) {
        return await this.changeSettings(peerId, model => model.gptModel = gptModel);
    }

    async setGptMaxOutputTokens(peerId: number, gptMaxOutputTokens: number): Promise<ChatSettingsModel> {
        return await this.changeSettings(peerId, model => model.gptMaxOutputTokens = gptMaxOutputTokens)
    }

    async setGptMaxInputTokens(peerId: number, gptMaxInputTokens: number): Promise<ChatSettingsModel> {
        return await this.changeSettings(peerId, model => model.gptMaxInputTokens = gptMaxInputTokens)
    }

    async setGptTemperature(peerId: number, gptTemperature: number): Promise<ChatSettingsModel> {
        return await this.changeSettings(peerId, model => model.gptTemperature = gptTemperature)
    }

    async setGptTopP(peerId: number, gptTopP: number): Promise<ChatSettingsModel> {
        return await this.changeSettings(peerId, model => model.gptTopP = gptTopP)
    }

    async setGptFrequencyPenalty(peerId: number, gptFrequencyPenalty: number): Promise<ChatSettingsModel> {
        return await this.changeSettings(peerId, model => model.gptFrequencyPenalty = gptFrequencyPenalty)
    }

    async setGptPresencePenalty(peerId: number, gptPresencePenalty: number): Promise<ChatSettingsModel> {
        return this.changeSettings(peerId, model => model.gptPresencePenalty = gptPresencePenalty)
    }

    async setProcessAudioMessages(peerId: number, processAudioMessages: boolean): Promise<ChatSettingsModel> {
        return this.changeSettings(peerId, model => model.processAudioMessages = processAudioMessages)
    }

    private async changeSettings(
        peerId: number,
        change: (entity: ChatSettingsModel) => void
    ): Promise<ChatSettingsModel> {
        const model = await this.getSettingsOrCreateDefault(peerId);
        change(model);
        return this.chatSettingsOrmService.saveSettings(peerId, model);
    }
}
