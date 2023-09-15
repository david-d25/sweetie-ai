import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";
import {DocumentAttachment} from "vk-io";
import {getFileName, toUserFriendlyDate, toUserFriendlySize} from "../util/VkUtil";
import axios from "axios";
import {FineTuningJob, FineTuningJobStatus} from "../service/FineTuningService";
import ServiceError from "../ServiceError";

export default class FineTuningCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "learning";
    }

    getCommandShortUsage(): string {
        return "/sweet learning (...)";
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        const subCommand = rawArguments.split(" ")[0];
        const restArgs = rawArguments.substring(subCommand.length + 1);
        if (!subCommand) {
            await vkMessagesService.send(message.peerId, this.getUsage());
        } else if (subCommand == 'jobs') {
            await this.handleJobs(restArgs, message);
        } else if (subCommand == 'learn') {
            await this.handleLearn(restArgs, message);
        } else if (subCommand == 'cancel') {
            await this.handleCancel(restArgs, message);
        } else if (subCommand == 'help') {
            await vkMessagesService.send(message.peerId, this.getUsage());
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleJobs(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, fineTuningService } = this.context;
        const showAll = args == 'all';
        let response = `Задачи:\n`;
        let i = 1;
        for await (const job of fineTuningService.streamJobs()) {
            if (!showAll && job.status == "succeeded") {
                continue;
            }
            response += `# ${i}\n`;
            response += `ID: ${job.id}\n`;
            response += `Статус: ${this.toUserFriendlyStatus(job.status)}\n`;
            response += `Создана: ${toUserFriendlyDate(job.createdAt)}\n`;
            if (job.status != "running") {
                response += `Отчет: ${job.resultFiles.join(', ') || '(пусто)'}\n`;
            }
            i++;
        }
        if (i == 1) {
            response += `(пусто)`;
        }
        await vkMessagesService.send(message.peerId, response);
    }

    private async handleLearn(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        const subcommand = args.split(" ")[0];
        const restArgs = args.substring(subcommand.length + 1);
        if (!subcommand || subcommand == 'help') {
            await vkMessagesService.send(message.peerId, this.getLearnUsage());
        } else if (subcommand == 'prepared') {
            await this.handleLearnPrepared(restArgs, message);
        } else if (subcommand == 'raw') {
            await this.handleLearnRaw(restArgs, message);
        } else {
            await vkMessagesService.send(message.peerId, this.getLearnUsage());
        }
    }

    private async handleLearnPrepared(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, openAiFilesService, fineTuningService } = this.context;
        const attachments = message.attachments.filter(attachment => attachment.type == 'doc') as DocumentAttachment[];
        if (attachments.length == 0) {
            await vkMessagesService.send(message.peerId, `Чтобы обучить Сладенокго, прикрепи один файл с датасетом в формате JSONL`);
            return;
        }
        const attachment = attachments[0];
        const { size, url } = attachment;
        if (size == undefined || url == undefined) {
            await vkMessagesService.send(message.peerId, `Не получиось прочитать информацию про файл`);
            return;
        }
        if (attachment.extension != "jsonl") {
            await vkMessagesService.send(message.peerId, `Первый прикреплённый файл должен быть в формате JSONL`);
            return;
        }
        if (size > 50 * 1024 * 1024) {
            await vkMessagesService.send(message.peerId, `файл должен быть < 50 МБ, но весит ${toUserFriendlySize(size)}`);
            return;
        }
        console.log(`[${message.peerId}] Downloading attachment ${attachment.id}...`);
        const axiosResponse = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(axiosResponse.data);
        await vkMessagesService.send(message.peerId, `Проверяю файл...`);

        console.log(`[${message.peerId}] Uploading attachment ${attachment.id} to OpenAI...`);
        let file = await openAiFilesService.uploadFile(getFileName(attachment), buffer, "fine-tune");
        console.log(`[${message.peerId}] Waiting for file ${file.id} to be processed...`);
        openAiFilesService.waitFileStatus(file.id, ["processed", "error"], 2 * 60 * 60).then(async (file) => {
            if (file.status == "error") {
                console.error(`[${message.peerId}] Could not process file ${file.id} (OpenAI: ${file.statusDetails})...`);
                await vkMessagesService.send(message.peerId, `Не получилось обработать файл (OpenAI: ${file.statusDetails})`);
                return;
            }
            console.log(`[${message.peerId}] Creating a fine-tuning job with file ${file.id}...`);
            const job = await fineTuningService.createJob("gpt-3.5-turbo", file.id);
            await vkMessagesService.send(message.peerId, `Начинаю учиться...`);
            this.sendNotificationAfterLearningFinished(job, message);
        }).catch(async (e) => {
            console.error(e);
            await vkMessagesService.send(message.peerId, `Не получилось дождаться обработки файла (${e.message})`);
        });
    }

    private async handleLearnRaw(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        await vkMessagesService.send(message.peerId, `Сладенький пока не умеет работать с обычным текстом. Но скоро научится, если [id89446514|кое-кто] поторопится...`);
        // const attachments = message.attachments.filter(attachment => attachment.type == 'doc');
        // if (attachments.length == 0) {
        //     await vkMessagesService.send(message.peerId, `Чтобы обучить Сладенокго, прикрепи файл с текстом`);
        //     return;
        // }
        // todo
    }

    // private async handleEvents(args: string, message: VkMessage): Promise<void> {
    //     const { vkMessagesService, fineTuningService } = this.context;
    //     if (!args) {
    //         await vkMessagesService.send(message.peerId, `Укажи ID задачи, события которой нужно посмотреть`);
    //         return;
    //     }
    //     let response = `События:\n`;
    //     let i = 1;
    //     for await (const event of fineTuningService.streamEvents(args)) {
    //         response += `# ${i}\n`;
    //         response += `ID: ${event.id}\n`;
    //         response += `Сообщение: ${event.message}\n`;
    //         response += `Дата: ${toUserFriendlyDate(event.createdAt)}\n`;
    //         i++;
    //     }
    //     if (i == 1) {
    //         response += `(пусто)`;
    //     }
    //     await vkMessagesService.send(message.peerId, response);
    // }

    private async handleCancel(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, fineTuningService } = this.context;
        if (!args) {
            await vkMessagesService.send(message.peerId, `Укажи ID задачи, которую нужно отменить`);
            return;
        }
        await vkMessagesService.send(message.peerId, `Отменяю задачу`);
        await fineTuningService.cancelJob(args);
    }

    private sendNotificationAfterLearningFinished(job: FineTuningJob, message: VkMessage) {
        console.log(`[${message.peerId}] Waiting for job ${job.id} to be finished...`);
        const { vkMessagesService, fineTuningService, openAiFilesService, temporaryFilesHostService } = this.context;
        fineTuningService.waitJobStatus(job.id, ["succeeded", "failed", "cancelled"], 12*60*60).then(async (doneJob) => {
            if (doneJob.status == "succeeded") {
                console.log(`[${message.peerId}] Job ${job.id} finished successfully...`);
                await vkMessagesService.send(message.peerId, `Я закончил учиться!\nЧтобы использовать новые знания, напиши:\n/sweet model set ${doneJob.fineTunedModel}`);
            } else if (doneJob.status == "failed") {
                console.error(`[${message.peerId}] Job ${job.id} failed`);
                if (doneJob.resultFiles.length == 0) {
                    await vkMessagesService.send(message.peerId, `Я не смог обучиться. Возможно, в событиях есть подробности:\n/sweet learning events`);
                } else if (doneJob.resultFiles.length == 1) {
                    const file = await openAiFilesService.getFile(doneJob.resultFiles[0]);
                    const fileContent = await openAiFilesService.getFileContent(file.id);
                    const downloadLink = temporaryFilesHostService.addFile(file.name, fileContent, 60 * 60); // 1 hour
                    await vkMessagesService.send(message.peerId, `Я не смог обучиться. Подробнее в отчёте: ${downloadLink}`);
                } else {
                    await vkMessagesService.send(message.peerId, `Я не смог обучиться. Создано ${doneJob.resultFiles.length} файлов с отчётом. Все файлы: \n/sweet files`);
                }
            } else if (doneJob.status == "cancelled") {
                console.log(`[${message.peerId}] Job ${job.id} was cancelled...`);
                await vkMessagesService.send(message.peerId, `Обучение отменено`);
            } else {
                throw new Error("unknown job status: " + doneJob.status);
            }
        }).catch(async (e) => {
            console.error(e);
            await vkMessagesService.send(message.peerId, `Пока я следил за ходом учебы, у меня сломался интернет. Учеба, возможно, всё ещё идёт, но я не могу узнать, закончилась она или нет. Проверьте статус учёбы в /sweet learning jobs`);
        });
    }

    private toUserFriendlyStatus(status: FineTuningJobStatus): string {
        if (status == "created") {
            return "Создана";
        } else if (status == "pending") {
            return "В очереди";
        } else if (status == "running") {
            return "В процессе";
        } else if (status == "succeeded") {
            return "Завершена";
        } else if (status == "failed") {
            return "Провалена";
        } else if (status == "cancelled") {
            return "Отменена";
        } else {
            return status;
        }
    }

    private getUsage(): string {
        let result = ``;
        result += `Команды:\n`;
        result += `/sweet learning jobs\n`;
        result += `/sweet learning jobs all\n`;
        result += `/sweet learning learn (...)\n`;
        // result += `/sweet learning events\n`;
        result += `/sweet learning cancel (id)\n`;
        return result;
    }

    private getLearnUsage(): string {
        let result = ``;
        result += `Команды:\n`;
        result += `/sweet learning learn prepared\n`;
        result += `/sweet learning learn raw\n`;
        return result;
    }
}