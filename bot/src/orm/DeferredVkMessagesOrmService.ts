import {Context} from "../Context";
import {DeferredVkMessageModel} from "../service/DeferredVkMessagesService";

export default class DeferredVkMessagesOrmService {
    constructor(private context: Context) {
        context.onReady(() => this.init());
    }

    private async init() {
        const db = this.context.postgresClient;
        await db.query(`
            create table if not exists deferred_vk_messages (
                id      serial      primary key,
                peer_id bigint      not null,
                send_at timestamp   not null,
                text    text        not null
            )
        `);
    }

    public async save(model: DeferredVkMessageModel): Promise<DeferredVkMessageModel> {
        const db = this.context.postgresClient;
        const entity = this.modelToEntity(model);
        const rows = await db.query(`
            insert into deferred_vk_messages (
                peer_id,
                send_at,
                text
            ) values (
                $1,
                $2,
                $3
            ) returning *
        `, [entity.peer_id, entity.send_at, entity.text]);
        return this.entityToModel(rows.rows[0]);
    }

    public async getAll(): Promise<DeferredVkMessageModel[]> {
        const db = this.context.postgresClient;
        const rows = await db.query(`
            select * from deferred_vk_messages
        `);
        return rows.rows.map(this.entityToModel);
    }

    public async delete(id: number): Promise<void> {
        const db = this.context.postgresClient;
        await db.query(`
            delete from deferred_vk_messages where id = $1
        `, [id]);
    }

    private modelToEntity(model: DeferredVkMessageModel): DeferredVkMessageEntity {
        return {
            id: model.id,
            peer_id: model.peerId,
            send_at: model.sendAt,
            text: model.text
        }
    }

    private entityToModel(entity: DeferredVkMessageEntity): DeferredVkMessageModel {
        return {
            id: entity.id,
            peerId: entity.peer_id,
            sendAt: entity.send_at,
            text: entity.text
        }
    }
}

type DeferredVkMessageEntity = {
    id: number,
    peer_id: number,
    send_at: Date,
    text: string
}