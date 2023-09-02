import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class FilesCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "files";
    }

    getCommandShortUsage(): string {
        return "/sweet files (команда)";
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        // TODO
    }
}