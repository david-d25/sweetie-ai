import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";
import {Attachment, DocumentAttachment} from "vk-io";
import axios from "axios";
import ServiceError from "../ServiceError";
import {getFileName, toUserFriendlySize} from "../util/VkUtil";
import {OpenAiFile} from "../service/OpenAiFilesService";
import {wildcardMatch} from "../util/StringUtil";

export default class FilesCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "files";
    }

    getCommandShortUsage(): string {
        return "/sweet files (...)";
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        const subCommand = rawArguments.split(" ")[0];
        const restArgs = rawArguments.substring(subCommand.length + 1);
        if (!subCommand) {
            await this.handleList(message);
        } else if (subCommand == 'list') {
            await this.handleList(message);
        } else if (subCommand == 'upload') {
            await this.handleUpload(message);
        } else if (subCommand == 'delete') {
            await this.handleDelete(restArgs, message);
        } else if (subCommand == 'get') {
            await this.handleGet(restArgs, message);
        } else if (subCommand == 'help') {
            await vkMessagesService.send(message.peerId, this.getUsage());
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleList(message: VkMessage): Promise<void> {
        const { vkMessagesService, openAiFilesService } = this.context;
        const files = await openAiFilesService.listFiles();
        let response = `Файлы:\n`;
        if (files.length == 0) {
            response += `(пусто)`;
        } else {
            files.forEach(file => {
                response += `# ${file.name} (${toUserFriendlySize(file.sizeBytes)})\n`;
                response += `ID: ${file.id}\n`;
                response += `Статус: ${this.getUserFriendlyStatus(file)}\n`;
                response += `\n`;
            });
        }
        await vkMessagesService.send(message.peerId, response);
    }

    private async handleDelete(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, openAiFilesService } = this.context;
        if (args.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const subcommand = args.split(" ")[0];
        const restArgs = args.substring(subcommand.length + 1);
        if (subcommand == 'id') {
            const files = await openAiFilesService.listFiles();
            const file = files.find(file => file.id == restArgs);
            if (!file) {
                await vkMessagesService.send(message.peerId, `Не нашел файл с id '${restArgs}'`);
                return;
            }
            await openAiFilesService.deleteFile(restArgs);
            await vkMessagesService.send(message.peerId, `Удалил файл с id '${restArgs}'`);
        } else if (subcommand == 'name') {
            const files = await openAiFilesService.listFiles();
            const filesToDelete = files.filter(file => wildcardMatch(restArgs, file.name));
            if (filesToDelete.length == 0) {
                await vkMessagesService.send(message.peerId, `Нечего удалить`);
                return;
            }
            let deletedFiles = 0;
            for (const file of filesToDelete) {
                try {
                    if (await openAiFilesService.deleteFile(file.id))
                        deletedFiles++;
                } catch (e) {
                    console.error(e)
                }
            }
            if (deletedFiles == 0) {
                await vkMessagesService.send(message.peerId, `Не получилось удалить`);
                return;
            }
            if (deletedFiles < filesToDelete.length) {
                await vkMessagesService.send(message.peerId, `Хотел удалить ${filesToDelete.length} файлов, но получилось только ${deletedFiles}`);
                return;
            }
            await vkMessagesService.send(message.peerId, `Удалил ${deletedFiles} файлов`);
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleGet(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, openAiFilesService, temporaryFilesHostService } = this.context;
        if (args.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const files = await openAiFilesService.listFiles();
        const file = files.find(file => file.id == args);
        if (file == undefined) {
            await vkMessagesService.send(message.peerId, `Не нашел файл с id '${args}'`);
            return;
        }
        const fileContent = await openAiFilesService.getFileContent(file.id);
        const downloadLink = temporaryFilesHostService.addFile(file.name, fileContent, 15 * 60); // 15 minutes
        await vkMessagesService.send(message.peerId, `Скачать файл: ${downloadLink}`);
    }

    private async handleUpload(message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        const attachments = message.attachments.filter(attachment => attachment.type == 'doc');
        if (attachments.length == 0) {
            await vkMessagesService.send(message.peerId, `Прикрепи файл`);
            return;
        }
        const errorByFile: Map<String, String> = new Map();
        for (const attachment of attachments) {
            const document = attachment as DocumentAttachment;
            try {
                await this.handleSingleFileUpload(document);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Неизвестная ошибка";
                errorByFile.set(getFileName(document), message);
            }
        }
        if (errorByFile.size == 0) {
            await vkMessagesService.send(message.peerId, `Загрузил файлы`);
        } else if (errorByFile.size == 1) {
            const fileName = errorByFile.keys().next().value;
            const errorMessage = errorByFile.get(fileName);
            await vkMessagesService.send(message.peerId, `Не получилось загрузить файл (${errorMessage})`);
        } else {
            let response = `Некоторые файлы (${errorByFile.size}) не получилось загрузить\n`;
            for (const fileName of errorByFile.keys()) {
                response += `# ${fileName}:\n`;
                response += `> ${errorByFile.get(fileName)}\n`;
            }
            await vkMessagesService.send(message.peerId, response);
        }
    }

    private async handleSingleFileUpload(document: DocumentAttachment): Promise<void> {
        const { openAiFilesService } = this.context;
        const supportedExtensions = [ "jsonl" ];
        const { size, url } = document;
        if (size == undefined || url == undefined) {
            throw new ServiceError(`не получиось прочитать информацию про файл`);
        }
        if (!supportedExtensions.includes(document.extension || "")) {
            throw new ServiceError(`можно загружать только файлы ${supportedExtensions.join(", ")}`);
        }
        if (size > 50 * 1024 * 1024) {
            throw new ServiceError(`файл должен быть < 50 МБ, но весит ${toUserFriendlySize(size)}`);
        }
        const axiosResponse = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(axiosResponse.data);
        await openAiFilesService.uploadFile(getFileName(document), buffer, "fine-tune");
    }

    private getUserFriendlyStatus(file: OpenAiFile) {
        let result: string;
        switch (file.status) {
            case "uploaded":    result = "загружен";    break;
            case "processed":   result = "обработан";   break;
            case "pending":     result = "ожидает";     break;
            case "error":       result = "ошибка";      break;
            case "deleting":    result = "удаляется";   break;
            case "deleted":     result = "удалён";      break;
            default:            result = file.status;   break;
        }
        if (file.statusDetails != null) {
            result += ` (${file.statusDetails})`;
        }
        return result;
    }

    private getUsage(): string {
        let result = ``;
        result += `Команды:\n`;
        result += `/sweet files\n`;
        result += `/sweet files list\n`;
        result += `/sweet files help\n`;
        result += `/sweet files upload\n`;
        result += `/sweet files get (id)\n`;
        result += `/sweet files delete name (имя)\n`;
        result += `/sweet files delete id (id)\n`;
        return result;
    }
}