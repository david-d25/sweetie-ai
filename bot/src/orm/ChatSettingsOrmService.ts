import {Client} from "pg";
import {Context} from "../Context";
import {ChatSettingsModel} from "../service/ChatSettingsService";

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
                context text default null,
                memory text default null,
                gpt_max_output_tokens integer default 512,
                gpt_max_input_tokens integer default 8096,
                gpt_temperature real default 1,
                gpt_top_p real default 1,
                gpt_frequency_penalty real default 0,
                gpt_presence_penalty real default 0
            );
        `);
        await this.client.query(
            `alter table chat_settings add column if not exists bot_enabled boolean default true;`
        );
        await this.client.query(
            `alter table chat_settings add column if not exists gpt_model varchar default 'gpt-3.5-turbo-16k';`
        );
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
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                ) on conflict (peer_id) do update set
                     context = $2,
                     memory = $3,
                     gpt_max_output_tokens = $4,
                     gpt_max_input_tokens = $5,
                     gpt_temperature = $6,
                     gpt_top_p = $7,
                     gpt_frequency_penalty = $8,
                     gpt_presence_penalty = $9,
                     bot_enabled = $10,
                     gpt_model = $11
                returning *
            `,
            [
                entity.peer_id,
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
            throw new Error(`Can't save settings for id '${peerId}'`);
        }
        return this.entityToModel({...rows.rows[0]});
    }

    async createDefaultSettings(peerId: number): Promise<ChatSettingsModel> {
        const rows = await this.client.query(
            `insert into chat_settings (peer_id) values ($1) on conflict (peer_id) do nothing returning *`,
            [peerId]
        );
        if (rows.rows.length === 0) {
            throw new Error(`Can't create default settings for id '${peerId}'`);
        }
        return this.entityToModel({...rows.rows[0]});
    }

    private modelToEntity(model: ChatSettingsModel, peerId: number): ChatSettingsEntity {
        return {
            peer_id: peerId,
            bot_enabled: model.botEnabled,
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