import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";

export default class SettingsCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweetie settings';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'settings';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;

        if (rawArguments.length == 0)
            return vkMessagesService.send(message.peerId, this.getUsage());

        const subCommand = rawArguments.split(" ")[0];
        const text = rawArguments.slice(subCommand.length).trim();
        const settings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        if (subCommand == "list") {
            let response = ``;
            response += `model=${settings.gptModel}\n`;
            response += `max_output_tokens=${settings.gptMaxOutputTokens}\n`;
            response += `max_input_tokens=${settings.gptMaxInputTokens}\n`;
            response += `temperature=${settings.gptTemperature}\n`;
            response += `top_p=${settings.gptTopP}\n`;
            response += `frequency_penalty=${settings.gptFrequencyPenalty}\n`;
            response += `presence_penalty=${settings.gptPresencePenalty}\n`;
            return vkMessagesService.send(message.peerId, response);
        }

        if (subCommand == "get") {
            if (text.length == 0)
                return vkMessagesService.send(message.peerId, this.getUsage());
            const settingName = text;
            let value = null;
            if (settingName == "model")
                value = settings.gptModel;
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

            return vkMessagesService.send(message.peerId, `${settingName}=${value}`);
        }

        if (subCommand == "set") {
            if (text.length == 0)
                return vkMessagesService.send(message.peerId, this.getUsage());
            let args = text.split("=").map(x => x.trim());
            if (args.length == 1)
                args = text.split(" ").filter(x => x != "").map(x => x.trim());
            if (args.length != 2)
                return vkMessagesService.send(message.peerId, this.getUsage());

            const settingName = args[0];
            const settingValue = args[1];
            if (settingName == "model") {
                const possibleModels = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"];
                if (possibleModels.indexOf(settingValue) == -1)
                    return vkMessagesService.send(message.peerId, `Это должен быть один из следующих вариантов:\n${possibleModels.join('\n')}`);
                await chatSettingsService.setGptModel(message.peerId, settingValue);
            } else if (settingName == "max_output_tokens") {
                const value = parseInt(settingValue);
                if (isNaN(value) || value < 1 || value > 2048)
                    return vkMessagesService.send(message.peerId, `Это должно быть целое число от 1 до 2048`);
                await chatSettingsService.setGptMaxOutputTokens(message.peerId, value);
            } else if (settingName == "max_input_tokens") {
                const value = parseInt(settingValue);
                if (isNaN(value) || value < 4096 || value > 16384)
                    return vkMessagesService.send(message.peerId, `Это должно быть целое число от 4096 до 16384`);
                await chatSettingsService.setGptMaxInputTokens(message.peerId, value);
            } else if (settingName == "temperature") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    return vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                await chatSettingsService.setGptTemperature(message.peerId, value);
            } else if (settingName == "top_p") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 1)
                    return vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 1`);
                await chatSettingsService.setGptTopP(message.peerId, value);
            } else if (settingName == "frequency_penalty") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    return vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                await chatSettingsService.setGptFrequencyPenalty(message.peerId, value);
            } else if (settingName == "presence_penalty") {
                const value = parseFloat(settingValue);
                if (isNaN(value) || value < 0 || value > 2)
                    return vkMessagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                await chatSettingsService.setGptPresencePenalty(message.peerId, value);
            } else {
                return vkMessagesService.send(message.peerId, `Нет такого параметра`);
            }

            return vkMessagesService.send(message.peerId, `${settingName}=${settingValue}`);
        }
        return vkMessagesService.send(message.peerId, this.getUsage());
    }

    private getUsage(): string {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet settings list\n`;
        usage += `/sweet settings get (имя)\n`;
        usage += `/sweet settings set (имя)[=](значение)\n`;
        return usage;
    }
}