import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class ModelCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command.toLowerCase() === 'model';
    }

    getCommandShortUsage(): string {
        return '/sweet model (...)';
    }

    chatAdminOnly(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;

        const subCommand = rawArguments.split(" ")[0];
        if (!subCommand) {
            await this.handleShow(rawArguments, message);
        } else if (subCommand == 'list') {
            await this.handleList(rawArguments, message);
        } else if (subCommand == 'set') {
            await this.handleSet(rawArguments, message);
        } else if (subCommand == 'delete') {
            await this.handleDelete(rawArguments, message);
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
        const { chatGptService, vkMessagesService, chatSettingsService } = this.context;
        const models = await chatGptService.requestListModels();
        const settings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        const currentModel = settings.gptModel;
        let response = `Доступные модели: \n`;
        models.forEach(model => {
            response += `- ${model.id}`;
            if (currentModel == model.id) {
                response += ` (использую эту)`;
            }
            response += `\n`;
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
            await vkMessagesService.send(message.peerId, `Нет такой модели`);
        } else {
            await chatSettingsService.setGptModel(message.peerId, modelId);
            await vkMessagesService.send(message.peerId, `Ок`);
        }
    }

    private async handleDelete(rawArguments: string, message: VkMessage): Promise<void> {
        const { chatGptService, vkMessagesService, chatSettingsOrmService } = this.context;
        const modelId = rawArguments.split(" ")[1];
        if (!modelId) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const models = await chatGptService.requestListModels();
        if (!models.find(model => model.id == modelId)) {
            await vkMessagesService.send(message.peerId, `Нет такой модели`);
        }
        const response = await chatGptService.requestDeleteModel(modelId);
        if (response) {
            await chatSettingsOrmService.replaceModelGlobally(modelId, 'gpt-3.5-turbo');
            await vkMessagesService.send(message.peerId, `Удалил`);
        } else {
            await vkMessagesService.send(message.peerId, `Не получилось удалить`);
        }
    }

    private getUsage(): string {
        let usage = `Команды:\n`;
        usage += `/sweet model\n`;
        usage += `/sweet model help\n`;
        usage += `/sweet model list\n`;
        usage += `/sweet model set (имя)\n`;
        usage += `/sweet model delete (имя)\n`;
        return usage;
    }
}