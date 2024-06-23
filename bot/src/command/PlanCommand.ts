import Command from "./Command";
import {VkMessage} from "../service/VkMessagesService";
import ServiceError from "../ServiceError";

export default class PlanCommand extends Command {
    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command == "plan";
    }

    getCommandShortUsage(): string {
        return "/sweet plan (...)";
    }

    chatAdminOnly(peerId: number): boolean {
        return false;
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;

        const subCommand = rawArguments.split(" ")[0];
        if (!subCommand) {
            await this.handleDefault(message);
        } else if (subCommand == 'list') {
            await this.handleList(message);
        } else if (subCommand == 'help') {
            await vkMessagesService.send(message.peerId, this.getUsage());
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleDefault(message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        const user = await this.context.vkUsersService.getUser(message.fromId);
        if (!user) {
            throw new ServiceError("user not found");
        }
        const plan = await this.context.usagePlanService.getUsagePlanOrDefault(user.usagePlanId);
        const planTitle = plan ? plan.title : "(no plan)";
        let response = ``;
        response += `⚡ Sweetie AI ${planTitle}\n`;
        response += `🪙 Кредиты: ${user.credits}`;
        if (plan) {
            response += `/${plan.maxCredits}`;
        }
        response += `\n`;
        if (plan) {
            if (plan.creditGainPeriodSeconds > 0) {
                const creditsGainPerHour = Math.round(
                    plan.creditGainAmount / plan.creditGainPeriodSeconds * 3600 * 10
                ) / 10;
                response += `📈 Восполнение: ${creditsGainPerHour} к/ч\n`;
            }
            if (user.usagePlanExpiry) {
                const expiry = user.usagePlanExpiry;
                const expiryDateString = `${expiry.getDate()}.${expiry.getMonth() + 1}.${expiry.getFullYear()}`;
                response += `📆 Действует до ${expiryDateString}\n`;
            } else {
                response += `♾️ Действует вечно\n`;
            }
        }
        await vkMessagesService.send(message.peerId, response);
    }

    private async handleList(message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        let plans = await this.context.usagePlanOrmService.getUsagePlans();
        plans = plans
            .filter(plan => plan.visible)
            .sort(
                (a, b) => a.creditGainAmount/a.creditGainPeriodSeconds - b.creditGainAmount/b.creditGainPeriodSeconds
            );
        let response = `Планы:\n`;
        for (const plan of plans) {
            const creditsGainPerHour = Math.round(
                plan.creditGainAmount / plan.creditGainPeriodSeconds * 3600 * 10
            ) / 10;
            response += `- ${plan.title} (${creditsGainPerHour} к/ч, макс. ${plan.maxCredits})\n`;
        }
        await vkMessagesService.send(message.peerId, response);
    }

    private getUsage(): string {
        let result = '';
        result += 'Команды:\n';
        result += '/sweet plan\n';
        result += '/sweet plan list\n';
        result += '/sweet plan help\n';
        return result;
    }
}