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
import {VkUsersOrmService} from "./orm/VkUsersOrmService";
import UsagePlanOrmService from "./orm/UsagePlanOrmService";
import UsagePlanService from "./service/UsagePlanService";
import PlanCommand from "./command/PlanCommand";
import GrantCommand from "./command/GrantCommand";
import GiveCommand from "./command/GiveCommand";
import AudioService from "./service/AudioService";
import AppCeosOrmService from "./orm/AppCeosOrmService";
import LoggingService from "./service/LoggingService";
import VkStickerPacksOrmService from "./orm/VkStickerPacksOrmService";
import VkStickerPacksService from "./service/VkStickerPacksService";

const loggingService = new LoggingService();
const log = loggingService.getRootLogger();

function getAppVersion() {
    const defaultVersion = "(unknown version)";
    try {
        return require("../package.json").version || defaultVersion;
    } catch (e) {
        log.warn("Couldn't get version from package.json");
    }
    return defaultVersion;
}

export const version = getAppVersion();

log.info("Sweetie AI version " + version);

const configService = new ConfigService(loggingService);
const config = configService.getAppConfig();

log.info("Running in " + config.mode + " mode");

const vk = new VK({
    token: config.vkAccessToken,
    pollingGroupId: config.vkGroupId,
    uploadTimeout: 75e3,
    apiTimeout: 75e3,
    language: "ru"
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
        log.error("Couldn't connect to database: " + error);
        exit(1);
    } else {
        log.info("Connected to database");
        ready().then(() => {});
    }
});

async function ready() {
    const context = new Context();

    context.configService = configService;
    context.postgresClient = postgresClient;
    context.vk = vk;
    context.loggingService = loggingService;

    context.chatSettingsOrmService = new ChatSettingsOrmService(context);
    context.vkMessagesOrmService = new VkMessagesOrmService(context);
    context.deferredVkMessagesOrmService = new DeferredVkMessagesOrmService(context);
    context.chatAdminsOrmService = new ChatAdminsOrmService(context);
    context.usagePlanOrmService = new UsagePlanOrmService(context);
    context.vkUsersOrmService = new VkUsersOrmService(context);
    context.appCeosOrmService = new AppCeosOrmService(context);
    context.vkStickerPacksOrmService = new VkStickerPacksOrmService(context);

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
    context.usagePlanService = new UsagePlanService(context);
    context.audioService = new AudioService(context);
    context.vkStickerPacksService = new VkStickerPacksService(context);

    context.ready();

    const answerCommand = new AnswerCommand(context);
    context.botService.setTaggingHandler(answerCommand);
    context.botService.addCommandHandlers(
        new HelpCommand(context),
        answerCommand,
        new PlanCommand(context),
        // new SummarizeCommand(context),
        new ContextCommand(context),
        new GiveCommand(context),
        new GrantCommand(context),
        new SettingsCommand(context),
        new ModelCommand(context),
        new AdminsCommand(context),
        new DisableCommand(context),
    );
}