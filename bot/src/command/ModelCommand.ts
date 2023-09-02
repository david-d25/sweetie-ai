import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class ModelCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command.toLowerCase() === 'model';
    }

    getCommandShortUsage(): string {
        return '/sweet model (команда)';
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;

        if (rawArguments.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }

        const subCommand = rawArguments.split(" ")[0];
        if (subCommand == 'show') {
            await this.handleShow(rawArguments, message);
        } else if (subCommand == 'list') {
            await this.handleList(rawArguments, message);
        } else if (subCommand == 'set') {
            await this.handleSet(rawArguments, message);
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleShow(rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;
        const settings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        const model = settings.gptModel;
        await vkMessagesService.send(message.peerId, `Я использую модель '${model}'`);
    }

    private async handleList(rawArguments: string, message: VkMessage): Promise<void> {
        const { chatGptService, vkMessagesService } = this.context;
        const models = await chatGptService.requestListModels();
        let response = `Доступные модели: \n`;
        models.forEach(model => {
            response += `- ${model.id}\n`;
        });
        await vkMessagesService.send(message.peerId, response);
    }

    private async handleSet(rawArguments: string, message: VkMessage): Promise<void> {
        const { chatGptService, vkMessagesService, chatSettingsService } = this.context;
        const modelId = rawArguments.split(" ")[1];
        if (!modelId) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const models = await chatGptService.requestListModels();
        if (!models.find(model => model.id == modelId)) {
            await vkMessagesService.send(message.peerId, `Нет модели с названием '${modelId}'`);
        } else {
            await chatSettingsService.setGptModel(message.peerId, modelId);
            await vkMessagesService.send(message.peerId, `Буду использовать модель '${modelId}'`);
        }
    }

    private getUsage(): string {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet model show\n`;
        usage += `/sweet model list\n`;
        usage += `/sweet model set (имя)\n`;
        return usage;
    }
}