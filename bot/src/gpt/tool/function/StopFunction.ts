import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";

export default class StopFunction implements AssistantFunction {
    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        invocationContext.requestStop();
        return "StopFunction is requested.";
    }

    getDescription(): string {
        return "Call this if you're not going to write anything. " +
            "Your current attachments will be send as a response. " +
            "You can call this along with other attachment-creating functions. ";
    }

    getName(): string {
        return "stop";
    }

    getParameters(): AssistantObject | null {
        return null;
    }
}