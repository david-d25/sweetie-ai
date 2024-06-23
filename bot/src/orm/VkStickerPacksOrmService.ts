import {Client} from "pg";
import {Context} from "../Context";
import {VkStickerPack} from "../service/VkStickerPacksService";

export default class VkStickerPacksOrmService {
    private client!: Client;
    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    async start() {
        this.client = this.context.postgresClient!;
        const q = this.client.query.bind(this.client);
        await q(`
            create table if not exists vk_sticker_packs (
                id serial primary key,
                product_id bigint,
                name text,
                description text,
                first_sticker_id bigint,
                sticker_count int,
                enabled boolean
            );
        `);
        await q(`
            create index if not exists vk_sticker_packs__product_id_index on vk_sticker_packs(product_id);
        `);
        await q(`
            create index if not exists vk_sticker_packs__first_sticker_id_index on vk_sticker_packs(first_sticker_id);
        `);
        await q(`
            create index if not exists vk_sticker_packs__enabled_index on vk_sticker_packs(enabled);
        `);
        await q(`
            create table if not exists vk_sticker_images (
                sticker_id bigint,
                size int,
                with_background boolean,
                image bytea,
                primary key (sticker_id, size, with_background)
            );
        `);
    }

    async getAll(): Promise<VkStickerPack[]> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from vk_sticker_packs`);
        return result.rows.map(row => {
            return this.rowToStickerPack(row);
        });
    }

    async getEnabled(): Promise<VkStickerPack[]> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from vk_sticker_packs where enabled = true`);
        return result.rows.map(row => {
            return this.rowToStickerPack(row);
        });
    }

    async getById(id: number): Promise<VkStickerPack | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from vk_sticker_packs where id = $1`, [id]);
        if (result.rows.length == 0) {
            return null;
        }
        const row = result.rows[0];
        return this.rowToStickerPack(row);
    }

    async getByProductId(productId: number): Promise<VkStickerPack | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from vk_sticker_packs where product_id = $1`, [productId]);
        if (result.rows.length == 0) {
            return null;
        }
        const row = result.rows[0];
        return this.rowToStickerPack(row);
    }

    async getByStickerId(stickerId: number): Promise<VkStickerPack | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`
            select * from vk_sticker_packs
            where $1 between first_sticker_id and first_sticker_id + sticker_count - 1
        `, [
            stickerId
        ]);
        if (result.rows.length == 0) {
            return null;
        }
        const row = result.rows[0];
        return this.rowToStickerPack(row);
    }

    async storeStickerImage(stickerId: number, size: number, withBackground: boolean, image: Buffer) {
        const q = this.client.query.bind(this.client);
        await q(`
            insert into vk_sticker_images (sticker_id, size, with_background, image)
            values ($1, $2, $3, $4)
            on conflict (sticker_id, size, with_background)
            do update set image = excluded.image
        `, [stickerId, size, withBackground, image]);
    }

    async getStickerImage(stickerId: number, size: number, withBackground: boolean): Promise<Buffer | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`
            select image from vk_sticker_images
            where sticker_id = $1 and size = $2 and with_background = $3
        `, [stickerId, size, withBackground]);
        if (result.rows.length == 0) {
            return null;
        }
        return result.rows[0]['image'];
    }

    private rowToStickerPack(row: any): VkStickerPack {
        return {
            id: +row['id'],
            name: row['name'],
            productId: +row['product_id'],
            firstStickerId: +row['first_sticker_id'],
            stickerCount: +row['sticker_count'],
            enabled: !!row['enabled'],
        };
    }
}