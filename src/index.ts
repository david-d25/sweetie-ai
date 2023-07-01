import {VK} from "vk-io";
import {Client} from 'pg';
import VkMessagesService from "./service/VkMessagesService";
import VkUsersService from "./service/VkUsersService";
import Bot from "./Bot";
import ChatGptService from "./service/ChatGptService";
import ConfigService from "./service/ConfigService";
import VkMessagesOrmService from "./orm/VkMessagesOrmService";
import ChatSettingsOrmService from "./orm/ChatSettingsOrmService";
import ChatSettingsService from "./service/ChatSettingsService";
import ImageGenerationService from "./service/ImageGenerationService";

const config = new ConfigService();

const vk = new VK({
    token: config.requireEnv('VK_ACCESS_TOKEN')!,
    pollingGroupId: +config.requireEnv('VK_GROUP_ID')!
});

const client = new Client({
    user: config.requireEnv('DB_USER'),
    host: config.requireEnv('DB_HOST'),
    database: config.requireEnv('DB_NAME'),
    password: config.requireEnv('DB_PASSWORD'),
    port: +(config.getEnv('DB_PORT') || 5432),
});

client.connect((error: any) => {
    if (error) {
        console.error("Couldn't connect to database", error);
        process.exit(1);
    } else {
        console.log("Connected to database");
        ready().then(ignored => {});
    }
});

async function ready() {
    const chatSettingsOrmService = new ChatSettingsOrmService(client);
    await chatSettingsOrmService.start();

    const messagesOrmService = new VkMessagesOrmService(client);
    await messagesOrmService.start();

    const messagesService = new VkMessagesService(vk, messagesOrmService);
    messagesService.start();

    const usersService = new VkUsersService(vk);
    const chatGptService = new ChatGptService(config);
    const imageGenerationService = new ImageGenerationService(config);
    const chatSettingsService = new ChatSettingsService(chatSettingsOrmService);

    new Bot(
        vk,
        messagesService,
        usersService,
        chatGptService,
        config,
        chatSettingsService,
        imageGenerationService
    ).start();
}