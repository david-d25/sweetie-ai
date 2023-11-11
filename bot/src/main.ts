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
import DeferredVkMessagesOrmService from "./orm/DeferredVkMessagesOrmService";
import DeferredVkMessagesService from "./service/DeferredVkMessagesService";
import MetaphorService from "./service/MetaphorService";
import ChatAdminsOrmService from "./orm/ChatAdminsOrmService";
import UserPermissionsService from "./service/UserPermissionsService";
import ModelCommand from "./command/ModelCommand";
import AdminsCommand from "./command/AdminsCommand";
import TemporaryFileHostService from "./service/TemporaryFileHostService";

function getAppVersion() {
    const defaultVersion = "(unknown version)";
    try {
        return require("../package.json").version || defaultVersion;
    } catch (e) {
        console.warn("Couldn't get version from package.json");
    }
    return defaultVersion;
}

export const version = getAppVersion();

console.log("Sweetie AI version " + version);

const configService = new ConfigService();
const config = configService.getAppConfig();

const vk = new VK({
    token: config.vkAccessToken,
    pollingGroupId: config.vkGroupId,
    uploadTimeout: 75e3,
    apiTimeout: 75e3
});

const postgresClient = new Client({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbName,
    password: config.dbPassword,
    port: config.dbPort || 5432,
});

postgresClient.connect((error: any) => {
    if (error) {
        console.error("Couldn't connect to database", error);
        exit(1);
    } else {
        console.log("Connected to database");
        ready().then(() => {});
    }
});

async function ready() {
    const context = new Context();

    context.configService = configService;
    context.postgresClient = postgresClient;
    context.vk = vk;

    context.chatSettingsOrmService = new ChatSettingsOrmService(context);
    context.vkMessagesOrmService = new VkMessagesOrmService(context);
    context.deferredVkMessagesOrmService = new DeferredVkMessagesOrmService(context);
    context.chatAdminsOrmService = new ChatAdminsOrmService(context);

    context.botService = new BotService(context);
    context.userPermissionsService = new UserPermissionsService(context);
    context.deferredVkMessagesService = new DeferredVkMessagesService(context);
    context.vkMessagesService = new VkMessagesService(context);
    context.vkUsersService = new VkUsersService(context);
    context.chatGptService = new ChatGptService(context);
    context.imageGenerationService = new ImageGenerationService(context);
    context.chatSettingsService = new ChatSettingsService(context);
    context.metaphorService = new MetaphorService(context);
    context.temporaryFilesHostService = new TemporaryFileHostService(context);

    context.ready();

    const answerCommand = new AnswerCommand(context);
    context.botService.setTaggingHandler(answerCommand);
    context.botService.addCommandHandlers(
        new HelpCommand(context),
        answerCommand,
        // new SummarizeCommand(context),
        new ContextCommand(context),
        new SettingsCommand(context),
        new ModelCommand(context),
        new AdminsCommand(context),
        new DisableCommand(context),
    );
}