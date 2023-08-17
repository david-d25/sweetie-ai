import {Client} from "pg";
import ConfigService from "./service/ConfigService";
import ChatSettingsOrmService from "./orm/ChatSettingsOrmService";
import VkMessagesOrmService from "./orm/VkMessagesOrmService";
import VkMessagesService from "./service/VkMessagesService";
import VkUsersService from "./service/VkUsersService";
import ImageGenerationService from "./service/ImageGenerationService";
import ChatGptService from "./service/ChatGptService";
import {VK} from "vk-io";
import ChatSettingsService from "./service/ChatSettingsService";
import BotService from "./service/BotService";
import DeferredVkMessagesOrmService from "./orm/DeferredVkMessagesOrmService";
import DeferredVkMessagesService from "./service/DeferredVkMessagesService";
import MetaphorService from "./service/MetaphorService";

export class Context {
    configService!: ConfigService;
    postgresClient!: Client;
    vk!: VK;
    chatSettingsOrmService!: ChatSettingsOrmService;
    vkMessagesOrmService!: VkMessagesOrmService;
    deferredVkMessagesOrmService!: DeferredVkMessagesOrmService;
    deferredVkMessagesService!: DeferredVkMessagesService;
    vkMessagesService!: VkMessagesService;
    vkUsersService!: VkUsersService;
    chatGptService!: ChatGptService;
    imageGenerationService!: ImageGenerationService;
    chatSettingsService!: ChatSettingsService;
    metaphorService!: MetaphorService;
    botService!: BotService;

    readyFlag = false;
    readyListeners: (() => void)[] = [];

    onReady(listener: () => void) {
        if (this.readyFlag) {
            listener();
        } else {
            this.readyListeners.push(listener);
        }
    }

    ready() {
        this.readyFlag = true;
        this.readyListeners.forEach(listener => listener());
    }
}