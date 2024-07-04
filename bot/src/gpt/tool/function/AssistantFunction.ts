import {VkMessage} from "../../../service/VkMessagesService";
import {CompletionMessageDto} from "../../../service/ChatGptService";
import {Attachment, ExternalAttachment} from "vk-io";

export default interface AssistantFunction {
    getDescription(): string;
    getName(): string;
    getParameters(): AssistantObject | null;
    call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string>;
}

export interface InvocationContext {
    addAttachment(value: Attachment): void;
    requestStop(): void;
    appendMessage(message: CompletionMessageDto): void;
    chargeCredits(credits: number): void;
    lookupAttachment(attachmentId: number): Attachment | ExternalAttachment | null;
}

export type AssistantFunctionParameter = AssistantObject | AssistantString | AssistantInteger | AssistantNumber | AssistantBoolean;

export type AssistantInteger = {
    type: "integer";
    description?: string;
}

export type AssistantNumber = {
    type: "number";
    description?: string;
}

export type AssistantBoolean = {
    type: "boolean";
    description?: string;
}

export type AssistantString = {
    type: "string";
    enum?: string[];
    description?: string;
};

export type AssistantObject = {
    type: "object";
    properties: { [key: string]: AssistantFunctionParameter };
    required?: string[];
}
