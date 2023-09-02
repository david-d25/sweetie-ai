import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class AdminCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "admin";
    }

    getCommandShortUsage(): string {
        return "/sweet admin (команда)";
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;

        if (rawArguments.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }

        const subCommand = rawArguments.split(" ")[0];
        const restArgs = rawArguments.substring(subCommand.length + 1);
        if (subCommand == 'list') {
            await this.handleList(message);
        } else if (subCommand == 'add') {
            await this.handleAdd(restArgs, message);
        } else if (subCommand == 'remove') {
            await this.handleRemove(restArgs, message);
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleList(message: VkMessage): Promise<void> {
        const { vkMessagesService, chatAdminsOrmService } = this.context;
        const chatMembers = await vkMessagesService.getChatMembers(message.peerId);
        const vkAdmins = chatMembers.filter(member => member.isAdmin);
        const sweetAdmins = await chatAdminsOrmService.getChatAdmins(message.peerId);
        let response = `Над Сладеньким имеют власть:\n`;
        if (vkAdmins.length == 0 && sweetAdmins.length == 0) {
            response += `Никто :(`;
        }
        if (vkAdmins.length > 0) {
            response += `\n# Админы беседы\n`;
            vkAdmins.forEach(admin => {
                response += `- ${admin.displayName}\n`;
            });
        }
        if (sweetAdmins.length > 0) {
            response += `\n# Админы Сладенького\n`;
            sweetAdmins.forEach(adminId => {
                const member = chatMembers.find(member => member.memberId == adminId);
                const displayName = member?.displayName || ('id' + adminId);
                response += `- ${displayName}\n`;
            });
        }
        await vkMessagesService.send(message.peerId, response);
    }

    private async handleAdd(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatAdminsOrmService } = this.context;
        if (args.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const memberId = this.extractMemberId(args);
        if (memberId == null) {
            await vkMessagesService.send(message.peerId, `Не могу найти такого пользователя`);
            return;
        }
        const sweetAdmins = await chatAdminsOrmService.getChatAdmins(message.peerId);
        if (sweetAdmins.includes(memberId)) {
            await vkMessagesService.send(message.peerId, `Уже админ`);
            return;
        }
        await chatAdminsOrmService.addAdmin(message.peerId, memberId);
        await vkMessagesService.send(message.peerId, `Добавил админа`);
    }

    private async handleRemove(args: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatAdminsOrmService } = this.context;
        if (args.length == 0) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const memberId = this.extractMemberId(args);
        if (memberId == null) {
            await vkMessagesService.send(message.peerId, `Не могу найти такого пользователя`);
            return;
        }
        await chatAdminsOrmService.removeAdmin(message.peerId, memberId);
        await vkMessagesService.send(message.peerId, `Удалил админа`);
    }

    private extractMemberId(text: string): number | null {
        const regex = /\[?(id|club)(\d+)\|?/;
        const match = text.match(regex);
        if (match && !isNaN(+match[2])) {
            return +match[2];
        } else {
            return null;
        }
    }

    private getUsage(): string {
        let result = '';
        result += 'Как пользоваться:\n';
        result += '/sweet admin list\n';
        result += '/sweet admin add (тег)\n';
        result += '/sweet admin remove (тег)\n';
        return result;
    }
}