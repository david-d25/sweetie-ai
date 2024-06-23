import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";

export default class GiveCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "give";
    }

    getCommandShortUsage(): string {
        return "/sweet give (credits_amount) (user)";
    }

    chatAdminOnly(peerId: number): boolean {
        return true;
    }

    appCeoOnly(): boolean {
        return true;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;

        const firstArg = rawArguments.split(" ")[0];
        const restArgs = rawArguments.substring(firstArg.length + 1);
        const creditsAmount = parseInt(firstArg);
        if (isNaN(creditsAmount)) {
            await vkMessagesService.send(message.peerId, this.getUsage());
            return;
        }

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
        await this.context.vkUsersOrmService.addCredits(memberId, creditsAmount);
        await vkMessagesService.send(message.peerId, `✨ Выдаю ${creditsAmount} кредитов`);
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
        result += '/sweet give (credits_amount) (user)\n';
        return result;
    }
}