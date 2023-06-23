import {Client} from "pg";

export default class ChatSettingsOrmService {
    constructor(
        private client: Client
    ) {}

    // Good sample: t=1.75, tp=0.92, fp=0.72, pp=1.7
    async start() {
        return this.client.query(`
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
    }

    async getSettings(peerId: number): Promise<ChatSettingsEntity | null> {
        const rows = await this.client.query(
            `select * from chat_settings where peer_id = $1`,
            [peerId]
        );
        if (rows.rows.length === 0) {
            return null;
        }
        return {
            peer_id: peerId,
            context: rows.rows[0]['context'],
            memory: rows.rows[0]['memory'],
            gpt_max_output_tokens: rows.rows[0]['gpt_max_output_tokens'],
            gpt_max_input_tokens: rows.rows[0]['gpt_max_input_tokens'],
            gpt_temperature: rows.rows[0]['gpt_temperature'],
            gpt_top_p: rows.rows[0]['gpt_top_p'],
            gpt_frequency_penalty: rows.rows[0]['gpt_frequency_penalty'],
            gpt_presence_penalty: rows.rows[0]['gpt_presence_penalty']
        };
    }

    async setSettings(settings: ChatSettingsEntity) {
        return this.client.query(
            `insert into chat_settings (peer_id, context, memory, gpt_max_output_tokens, gpt_max_input_tokens, gpt_temperature, gpt_top_p, gpt_frequency_penalty, gpt_presence_penalty) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (peer_id) do update set context = $2, memory = $3, gpt_max_output_tokens = $4, gpt_max_input_tokens = $5, gpt_temperature = $6, gpt_top_p = $7, gpt_frequency_penalty = $8, gpt_presence_penalty = $9`,
            [
                settings.peer_id,
                settings.context,
                settings.memory,
                settings.gpt_max_output_tokens,
                settings.gpt_max_input_tokens,
                settings.gpt_temperature,
                settings.gpt_top_p,
                settings.gpt_frequency_penalty,
                settings.gpt_presence_penalty
            ]
        );
    }

    async createDefaultSettings(peerId: number) {
        return this.client.query(
            `insert into chat_settings (peer_id) values ($1) on conflict (peer_id) do nothing`,
            [peerId]
        );
    }
}

export type ChatSettingsEntity = {
    peer_id: number,
    context: string | null,
    memory: string | null,
    gpt_max_output_tokens: number,
    gpt_max_input_tokens: number,
    gpt_temperature: number,
    gpt_top_p: number,
    gpt_frequency_penalty: number,
    gpt_presence_penalty: number
}