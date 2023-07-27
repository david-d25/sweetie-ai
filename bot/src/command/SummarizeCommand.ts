// import Command from "./Command";
// import {Context} from "../Context";
// import {VkMessage} from "../service/VkMessagesService";
// import * as AnswerCommandTemplates from "../template/AnswerCommandTemplates";
// import {PhotoAttachment} from "vk-io";
// import {hexToRgb} from "../util/ColorUtil";
// import axios from "axios";
// import sharp from "sharp";
//
// export default class SummarizeCommand extends Command {
//     constructor(context: Context) {
//         super(context);
//     }
//
//     getCommandShortUsage(): string {
//         return '/sweetie summarize (текст)';
//     }
//
//     canYouHandleThisCommand(command: string, message: VkMessage): boolean {
//         return command === 'summarize';
//     }
//
//     handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
//         let messagesLimit = 250;
//
//         if (args.length <= 1) {
//             let usage = `Пиши так:\n`;
//             usage += `/sweet summarize (время)\n`;
//             usage += `Например:\n`;
//             usage += `/sweet summarize сегодня\n`;
//             usage += `/sweet summarize вчера\n`;
//             usage += `\n`;
//             usage += `Обычно бот читает последние ${messagesLimit} сообщений. Чтобы расширить этот лимит, можно написать так:\n`;
//             usage += `/sweet summarize 2000\n`;
//             return this.messagesService.send(message.peerId, usage);
//         }
//         let criteria = args.splice(1).join(" ");
//
//         if (!isNaN(+criteria)) {
//             messagesLimit = +criteria;
//             criteria = "(no criteria, use all messages)";
//         }
//
//         if (messagesLimit > 400) {
//             await this.messagesService.send(message.peerId, `Начинаю читать ${messagesLimit} сообщений в переписке, это займёт некоторое время.`);
//         }
//
//         const chatSettings = await this.chatSettingsService.getSettingsOrDefault(message.peerId);
//         const question = "Перескажи сообщения в соответствии с вопросом или критерием: " + criteria;
//         let chatMessages = [];
//         chatMessages.push({
//             role: "user",
//             content: question
//         });
//
//         let history = await this.messagesService.getHistory(message.peerId, messagesLimit);
//         let fullHistory = (
//             await Promise.all(
//                 history.map(async m => {
//                     if (m.text == null)
//                         return null;
//                     const date = new Date(m.timestamp * 1000);
//                     let result = `[${date.getDay()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}] `;
//                     result += ((await this.usersService.getUser(m.fromId))?.firstName || "(unknown)") + ": ";
//                     result += m.text;
//                     return result;
//                 })
//             )
//         ).filter(m => m != null).map(m => m!);
//
//         let maxMessagesSize = chatSettings.gptMaxInputTokens - 2400; // 2400 - base system message size approximation
//         let historyBlocks = this.chunkStrings(fullHistory, maxMessagesSize);
//
//         let summary = null;
//         let date = new Date();
//
//         for (let i = 0; i < historyBlocks.length; i++) {
//             let systemMessage = `Ты саркастичный чат-бот по имени Сладенький в переписке ВКонтакте. `
//             systemMessage += `Дата сегодня: ${date.toDateString()}, время: ${date.getHours()} часов, ${date.getMinutes()} минут. `
//             systemMessage += `Тебе предстоит кратко изложить переписку коротким сообщением. `;
//             systemMessage += `Сообщений может оказаться слишком много, поэтому они могут быть разделены на куски. `;
//             systemMessage += `Сейчас обрабатываем часть ${i + 1} из ${historyBlocks.length}. `;
//             systemMessage += `Пользователь хочет получить изложение только сообщений, относящихся к его запросу. `;
//             systemMessage += `Например, запрос "сегодня" значит, что надо пересказать только сегодняшние сообщения. `;
//             systemMessage += `Критерий: """${criteria}""". `;
//             systemMessage += `Все остальные сообщения надо игнорировать и не включать в изложение. `;
//             systemMessage += `Изложение текущего блока надо комбинировать с изложением предыдущего блока сообщений. `;
//
//             if (summary != null) {
//                 systemMessage += `Вот пересказ предыдущих сообщений:\n"""\n${summary}\n"""\n`;
//             }
//
//             systemMessage += `Каждое сообщение имеет дату и имя в начале. Не показывай эти данные пользователям, это метаданные и они только для тебя. `;
//
//             systemMessage += `Вот последние сообщения:\n"""\n${historyBlocks[i].join("\n")}\n"""\n`;
//             systemMessage += `Напиши новый пересказ, включая как пересказ предыдущий сообщений, так и новые сообщения. `;
//             systemMessage += `Никогда не используй формат [id|Имя], вместо этого используй только имя человека.`;
//             systemMessage += `Старайся использовать русские варианты имён, если с тобой говорят на русском. `;
//
//             console.debug(systemMessage);
//
//             summary = await this.chatGptService.request(
//                 systemMessage,
//                 chatMessages,
//                 chatSettings.gptMaxOutputTokens,
//                 chatSettings.gptTemperature,
//                 chatSettings.gptTopP,
//                 chatSettings.gptFrequencyPenalty,
//                 chatSettings.gptPresencePenalty
//             );
//         }
//
//         await this.messagesService.send(message.peerId, summary || "(error, please check logs)");
//     }
//
//     private chunkStrings(strings: string[], maxLength: number): string[][] {
//         const result: string[][] = [];
//         let currentSubarray: string[] = [];
//         let currentLength = 0;
//
//         for (const str of strings) {
//             if (currentLength + str.length > maxLength) {
//                 result.push(currentSubarray);
//                 currentSubarray = [str];
//                 currentLength = str.length;
//             } else {
//                 currentSubarray.push(str);
//                 currentLength += str.length;
//             }
//         }
//
//         if (currentSubarray.length > 0) {
//             result.push(currentSubarray);
//         }
//
//         return result;
//     }
// }