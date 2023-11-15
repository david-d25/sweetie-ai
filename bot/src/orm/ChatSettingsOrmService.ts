import {Client} from "pg";
import {Context} from "../Context";
import {ChatSettingsModel} from "../service/ChatSettingsService";
import ServiceError from "../ServiceError";

export default class ChatSettingsOrmService {
    private client!: Client;
    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    private async start() {
        this.client = this.context.postgresClient;
        await this.client.query(`
            create table if not exists chat_settings (
                peer_id bigint primary key,
                name text default null,
                context text default null,
                memory text default null,
                gpt_max_output_tokens integer default 512,
                gpt_max_input_tokens integer default 2500,
                gpt_temperature real default 1,
                gpt_top_p real default 1,
                gpt_frequency_penalty real default 0,
                gpt_presence_penalty real default 0,
                bot_enabled boolean default true,
                gpt_model varchar default 'gpt-3.5-turbo'
            );
        `);
    }

    async getSettings(peerId: number): Promise<ChatSettingsModel | null> {
        const rows = await this.client.query(
            `select * from chat_settings where peer_id = $1`,
            [peerId]
        );
        if (rows.rows.length === 0) {
            return null;
        }
        return this.entityToModel({...rows.rows[0]});
    }

    async saveSettings(peerId: number, settings: ChatSettingsModel): Promise<ChatSettingsModel> {
        const entity = this.modelToEntity(settings, peerId);
        const rows = await this.client.query(
            `
                insert into chat_settings (
                    peer_id,
                    name,
                    context,
                    memory,
                    gpt_max_output_tokens,
                    gpt_max_input_tokens,
                    gpt_temperature,
                    gpt_top_p,
                    gpt_frequency_penalty,
                    gpt_presence_penalty,
                    bot_enabled,
                    gpt_model
                ) values (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                ) on conflict (peer_id) do update set
                     name = $2,
                     context = $3,
                     memory = $4,
                     gpt_max_output_tokens = $5,
                     gpt_max_input_tokens = $6,
                     gpt_temperature = $7,
                     gpt_top_p = $8,
                     gpt_frequency_penalty = $9,
                     gpt_presence_penalty = $10,
                     bot_enabled = $11,
                     gpt_model = $12
                returning *
            `,
            [
                entity.peer_id,
                entity.name,
                entity.context,
                entity.memory,
                entity.gpt_max_output_tokens,
                entity.gpt_max_input_tokens,
                entity.gpt_temperature,
                entity.gpt_top_p,
                entity.gpt_frequency_penalty,
                entity.gpt_presence_penalty,
                entity.bot_enabled,
                entity.gpt_model,
            ]
        );
        if (rows.rows.length === 0) {
            throw new ServiceError(`Can't save settings for id '${peerId}'`);
        }
        return this.entityToModel({...rows.rows[0]});
    }

    async replaceModelGlobally(oldModelId: string, newModelId: string): Promise<void> {
        await this.client.query(
            `update chat_settings set gpt_model = $1 where gpt_model = $2`,
            [newModelId, oldModelId]
        );
    }

    async createDefaultSettings(peerId: number): Promise<ChatSettingsModel> {
        const rows = await this.client.query(
            `insert into chat_settings (peer_id) values ($1) on conflict (peer_id) do nothing returning *`,
            [peerId]
        );
        if (rows.rows.length === 0) {
            throw new ServiceError(`Can't create default settings for id '${peerId}'`);
        }
        return this.entityToModel({...rows.rows[0]});
    }

    private modelToEntity(model: ChatSettingsModel, peerId: number): ChatSettingsEntity {
        return {
            peer_id: peerId,
            bot_enabled: model.botEnabled,
            name: model.nameCached,
            context: model.context,
            memory: model.memory,
            gpt_model: model.gptModel,
            gpt_max_output_tokens: model.gptMaxOutputTokens,
            gpt_max_input_tokens: model.gptMaxInputTokens,
            gpt_temperature: model.gptTemperature,
            gpt_top_p: model.gptTopP,
            gpt_frequency_penalty: model.gptFrequencyPenalty,
            gpt_presence_penalty: model.gptPresencePenalty,
        }
    }

    private entityToModel(entity: ChatSettingsEntity): ChatSettingsModel {
        return {
            botEnabled: entity.bot_enabled,
            nameCached: entity.name,
            context: entity.context,
            memory: entity.memory,
            gptModel: entity.gpt_model,
            gptMaxOutputTokens: entity.gpt_max_output_tokens,
            gptMaxInputTokens: entity.gpt_max_input_tokens,
            gptTemperature: entity.gpt_temperature,
            gptTopP: entity.gpt_top_p,
            gptFrequencyPenalty: entity.gpt_frequency_penalty,
            gptPresencePenalty: entity.gpt_presence_penalty,
        }
    }
}

export type ChatSettingsEntity = {
    peer_id: number,
    bot_enabled: boolean,
    name: string | null,
    context: string | null,
    memory: string | null,
    gpt_model: string,
    gpt_max_output_tokens: number,
    gpt_max_input_tokens: number,
    gpt_temperature: number,
    gpt_top_p: number,
    gpt_frequency_penalty: number,
    gpt_presence_penalty: number,
}