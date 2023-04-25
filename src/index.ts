import {VK} from "vk-io";
import VkMessagesService from "./VkMessagesService";
import VkUsersService from "./VkUsersService";
import Bot from "./Bot";
import ChatGptService from "./ChatGptService";
import ConfigService from "./ConfigService";

const config = new ConfigService();

const vk = new VK({
    token: config.getEnv('VK_ACCESS_TOKEN')!,
    pollingGroupId: +config.getEnv('VK_GROUP_ID')!
});

const messagesService = new VkMessagesService(vk);
const usersService = new VkUsersService(vk);
const chatGptService = new ChatGptService(config);

messagesService.start();

new Bot(vk, messagesService, usersService, chatGptService, config).start();