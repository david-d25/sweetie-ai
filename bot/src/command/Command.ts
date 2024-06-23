import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";

export default class Command {
    constructor(protected context: Context) {}

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return false;
    }

    getCommandShortUsage(): string {
        return "";
    }

    chatAdminOnly(peerId: number): boolean {
        return false;
    }

    appCeoOnly(): boolean {
        return false;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        return Promise.resolve();
    }
}