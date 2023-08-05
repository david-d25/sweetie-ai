import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";

export default class SendLaterMetaRequestHandler implements MetaRequestHandler {
    constructor (private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'sendLater';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length < 2) {
            response.metaRequestErrors.push('sendLater: not enough arguments');
            return Promise.resolve();
        }

        const messageText = request.args[0];
        const waitSeconds = parseInt(request.args[1]);

        if (isNaN(waitSeconds)) {
            response.metaRequestErrors.push('Система: Сладенький, количество секунд должно быть числом');
            return Promise.resolve();
        }
        if (!messageText) {
            response.metaRequestErrors.push('Система: Сладенький, текст сообщения не должен быть пустым');
            return Promise.resolve();
        }
        if (waitSeconds <= 0) {
            response.metaRequestErrors.push('Система: Сладенький, количество секунд должно быть положительным');
            return Promise.resolve();
        }

        console.log(`[${message.peerId}] sendLater: waitSeconds=${waitSeconds}, text=${messageText}`);
        await this.context.deferredVkMessagesService.sendLater(message.peerId, messageText, waitSeconds);
    }
}