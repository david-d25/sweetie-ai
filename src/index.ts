import {VK} from "vk-io";
import {Client} from 'pg';
import VkMessagesService from "./service/VkMessagesService";
import VkUsersService from "./service/VkUsersService";
import BotService from "./service/BotService";
import ChatGptService from "./service/ChatGptService";
import ConfigService from "./service/ConfigService";
import VkMessagesOrmService from "./orm/VkMessagesOrmService";
import ChatSettingsOrmService from "./orm/ChatSettingsOrmService";
import ChatSettingsService from "./service/ChatSettingsService";
import ImageGenerationService from "./service/ImageGenerationService";
import {Context} from "./Context";
import HelpCommand from "./command/HelpCommand";
import AnswerCommand from "./command/AnswerCommand";
import ContextCommand from "./command/ContextCommand";
import SettingsCommand from "./command/SettingsCommand";
import {exit} from 'node:process';
import DisableCommand from "./command/DisableCommand";

const configService = new ConfigService();

const vk = new VK({
    token: configService.requireEnv('VK_ACCESS_TOKEN')!,
    pollingGroupId: +configService.requireEnv('VK_GROUP_ID')!
});

const postgresClient = new Client({
    user: configService.requireEnv('DB_USER'),
    host: configService.requireEnv('DB_HOST'),
    database: configService.requireEnv('DB_NAME'),
    password: configService.requireEnv('DB_PASSWORD'),
    port: +(configService.getEnv('DB_PORT') || 5432),
});

postgresClient.connect((error: any) => {
    if (error) {
        console.error("Couldn't connect to database", error);
        exit(1);
    } else {
        console.log("Connected to database");
        ready().then(ignored => {});
    }
});

async function ready() {
    const context = new Context();

    context.configService = configService;
    context.postgresClient = postgresClient;
    context.vk = vk;

    context.chatSettingsOrmService = new ChatSettingsOrmService(context);
    context.vkMessagesOrmService = new VkMessagesOrmService(context);
    context.vkMessagesService = new VkMessagesService(context);
    context.vkUsersService = new VkUsersService(context);
    context.chatGptService = new ChatGptService(context);
    context.imageGenerationService = new ImageGenerationService(context);
    context.chatSettingsService = new ChatSettingsService(context);
    context.botService = new BotService(context);

    context.ready();

    context.botService.addCommandHandlers(
        new HelpCommand(context),
        new AnswerCommand(context),
        // new SummarizeCommand(context),
        new ContextCommand(context),
        new SettingsCommand(context),
        new DisableCommand(context),
    );
}