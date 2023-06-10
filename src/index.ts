import {VK} from "vk-io";
import {Client} from 'pg';
import VkMessagesService from "./VkMessagesService";
import VkUsersService from "./VkUsersService";
import Bot from "./Bot";
import ChatGptService from "./ChatGptService";
import ConfigService from "./ConfigService";
import VkMessagesOrmService from "./VkMessagesOrmService";

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
        console.error("Couldn't connect to database.", error);
        process.exit(1);
    } else {
        console.log("Connected to database.");
        ready().then(ignored => {});
    }
});

async function ready() {
    const messagesOrmService = new VkMessagesOrmService(client);
    await messagesOrmService.start();

    const messagesService = new VkMessagesService(vk, messagesOrmService);
    messagesService.start();

    const usersService = new VkUsersService(vk);
    const chatGptService = new ChatGptService(config);

    new Bot(vk, messagesService, usersService, chatGptService, config).start();
}