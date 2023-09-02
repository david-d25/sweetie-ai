import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";

export default class SettingsCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweetie settings (команда)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'settings';
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;

        if (rawArguments.length == 0)
            await vkMessagesService.send(message.peerId, this.getUsage());

        const subCommand = rawArguments.split(" ")[0];
        const text = rawArguments.slice(subCommand.length).trim();
        const settings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        if (subCommand == "list") {
            let response = ``;
            response += `max_output_tokens=${settings.gptMaxOutputTokens}\n`;
            response += `max_input_tokens=${settings.gptMaxInputTokens}\n`;
            response += `temperature=${settings.gptTemperature}\n`;
            response += `top_p=${settings.gptTopP}\n`;
            response += `frequency_penalty=${settings.gptFrequencyPenalty}\n`;
            response += `presence_penalty=${settings.gptPresencePenalty}\n`;
            await vkMessagesService.send(message.peerId, response);
        } else if (subCommand == "get") {
            if (text.length == 0)
                await  vkMessagesService.send(message.peerId, this.getUsage());
            const settingName = text;
            let value = null;
            if (settingName == "max_output_tokens")
                value = settings.gptMaxOutputTokens;
            if (settingName == "max_input_tokens")
                value = settings.gptMaxInputTokens;
            if (settingName == "temperature")
                value = settings.gptTemperature;
            if (settingName == "top_p")
                value = settings.gptTopP;
            if (settingName == "frequency_penalty")
                value = settings.gptFrequencyPenalty;
            if (settingName == "presence_penalty")
                value = settings.gptPresencePenalty;

            await vkMessagesService.send(message.peerId, `${settingName}=${value}`);
        } else if (subCommand == "set") {
            if (text.length == 0)
                await vkMessagesService.send(message.peerId, this.getUsage());
            let args = text.split("=").map(x => x.trim());
            if (args.length == 1)
                args = text.split(" ").filter(x => x != "").map(x => x.trim());
            if (args.length != 2)
                await vkMessagesService.send(message.peerId, this.getUsage());

            const settingName = args[0];
            const settingValue = args[1];
            if (settingName == "max_output_tokens") {
                const value = parseInt(settingValue);
                if (isNaN(value) || value < 1 || value > 2048)
                    await vkMessagesService.send(message.peerId, `Это должно быть целое число от 1 до 2048`);
                else
                    await chatSettingsService.setGptMaxOutputTokens(message.peerId, value);
            } else if (settingName == "max_input_tokens") {
                const value = parseInt(settingValue);
                if (isNaN(value) || value < 0 || value > 16384)
                    await vkMessagesService.send(message.peerId, `Это должно быть целое число от 0 до 16384`);
                else
                    await chatSettingsService.setGptMaxInputTokens(message.peerId, value);
            } else if (settingName == "temperature") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    await vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                else
                    await chatSettingsService.setGptTemperature(message.peerId, value);
            } else if (settingName == "top_p") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 1)
                    await vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 1`);
                else
                    await chatSettingsService.setGptTopP(message.peerId, value);
            } else if (settingName == "frequency_penalty") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    await vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                else
                    await chatSettingsService.setGptFrequencyPenalty(message.peerId, value);
            } else if (settingName == "presence_penalty") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    await vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                else
                    await chatSettingsService.setGptPresencePenalty(message.peerId, value);
            } else {
                await vkMessagesService.send(message.peerId, `Нет такого параметра`);
            }

            await vkMessagesService.send(message.peerId, `${settingName}=${settingValue}`);
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private getUsage(): string {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet settings list\n`;
        usage += `/sweet settings get (имя)\n`;
        usage += `/sweet settings set (имя)[=](значение)\n`;
        return usage;
    }
}