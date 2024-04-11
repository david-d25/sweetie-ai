import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class GrantCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "grant";
    }

    getCommandShortUsage(): string {
        return "/sweet grant (plan)[:days] (user)";
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, usagePlanOrmService } = this.context;

        const firstArg = rawArguments.split(" ")[0];
        let planId: string | null;
        let days: number | null = null;
        if (firstArg.includes(":")) {
            const parts = firstArg.split(":");
            planId = parts[0];
            days = +parts[1];
        } else {
            planId = firstArg;
        }
        if (!planId) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const plan = await usagePlanOrmService.getUsagePlan(planId);
        if (!plan) {
            await vkMessagesService.send(message.peerId, 'Нет такого плана');
            return;
        }
        const restArgs = rawArguments.substring(firstArg.length + 1);
        let memberId: number | null;
        if (restArgs.length > 0) {
            memberId = this.extractMemberId(restArgs);
            if (memberId == null) {
                await vkMessagesService.send(message.peerId, `Не могу найти такого пользователя`);
                return;
            }
        } else if (message.forwardedMessages.length == 1) {
            memberId = message.forwardedMessages[0].fromId;
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }
        const user = await this.context.vkUsersService.getUser(memberId);
        if (!user) {
            await vkMessagesService.send(message.peerId, `Не могу найти такого пользователя`);
            return;
        }
        const expiry = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
        await this.context.vkUsersOrmService.setUserUsagePlan(memberId, planId, expiry);
        await vkMessagesService.send(message.peerId, `✨ [id${Math.abs(memberId)}|Ты] получаешь Sweetie AI ${plan.title} ${expiry ? `до ${expiry.getDate()}.${expiry.getMonth() + 1}.${expiry.getFullYear()}` : 'навсегда'}`);
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
        result += 'Так пиши:\n';
        result += '/sweet grant (plan)[:days] [user]\n';
        return result;
    }
}