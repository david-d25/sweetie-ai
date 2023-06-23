import ChatSettingsOrmService, {ChatSettingsEntity} from "../orm/ChatSettingsOrmService";

export default class ChatSettingsService {
    constructor(
        private chatSettingsOrmService: ChatSettingsOrmService
    ) {}

    async getSettings(peerId: number): Promise<ChatSettingsModel> {
        return this.entityToModel(await this.getSettingsOrCreateDefault(peerId));
    }

    async setContext(peerId: number, context: string | null) {
        await this.changeSettings(peerId, entity => entity.context = context)
    }

    async setMemory(peerId: number, memory: string | null) {
        await this.changeSettings(peerId, entity => entity.memory = memory)
    }

    async setGptMaxOutputTokens(peerId: number, gptMaxOutputTokens: number) {
        await this.changeSettings(peerId, entity => entity.gpt_max_output_tokens = gptMaxOutputTokens)
    }

    async setGptMaxInputTokens(peerId: number, gptMaxInputTokens: number) {
        await this.changeSettings(peerId, entity => entity.gpt_max_input_tokens = gptMaxInputTokens)
    }

    async setGptTemperature(peerId: number, gptTemperature: number) {
        await this.changeSettings(peerId, entity => entity.gpt_temperature = gptTemperature)
    }

    async setGptTopP(peerId: number, gptTopP: number) {
        await this.changeSettings(peerId, entity => entity.gpt_top_p = gptTopP)
    }

    async setGptFrequencyPenalty(peerId: number, gptFrequencyPenalty: number) {
        await this.changeSettings(peerId, entity => entity.gpt_frequency_penalty = gptFrequencyPenalty)
    }

    async setGptPresencePenalty(peerId: number, gptPresencePenalty: number) {
        await this.changeSettings(peerId, entity => entity.gpt_presence_penalty = gptPresencePenalty)
    }

    private async changeSettings(peerId: number, change: (entity: ChatSettingsEntity) => void) {
        const entity = await this.getSettingsOrCreateDefault(peerId);
        change(entity);
        await this.chatSettingsOrmService.setSettings(entity);
    }

    private async getSettingsOrCreateDefault(peerId: number): Promise<ChatSettingsEntity> {
        let entity = await this.chatSettingsOrmService.getSettings(peerId);
        if (entity === null) {
            await this.chatSettingsOrmService.createDefaultSettings(peerId);
            entity = await this.chatSettingsOrmService.getSettings(peerId);
        }
        return entity!
    }

    private entityToModel(entity: ChatSettingsEntity): ChatSettingsModel {
        return {
            context: entity.context,
            memory: entity.memory,
            gptMaxOutputTokens: entity.gpt_max_output_tokens,
            gptMaxInputTokens: entity.gpt_max_input_tokens,
            gptTemperature: entity.gpt_temperature,
            gptTopP: entity.gpt_top_p,
            gptFrequencyPenalty: entity.gpt_frequency_penalty,
            gptPresencePenalty: entity.gpt_presence_penalty
        }
    }
}

export type ChatSettingsModel = {
    context: string | null,
    memory: string | null,
    gptMaxOutputTokens: number,
    gptMaxInputTokens: number,
    gptTemperature: number,
    gptTopP: number,
    gptFrequencyPenalty: number,
    gptPresencePenalty: number
}