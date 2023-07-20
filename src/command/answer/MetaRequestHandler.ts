import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";

export interface MetaRequestHandler {
    canYouHandleThis(requestName: string): boolean;
    handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void>;
}