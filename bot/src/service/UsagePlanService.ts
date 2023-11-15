import {Context} from "../Context";
import UsagePlanOrmService from "../orm/UsagePlanOrmService";
import ServiceError from "../ServiceError";

export type UsagePlan = {
    id: string,
    title: string,
    maxCredits: number,
    creditGainAmount: number,
    creditGainPeriodSeconds: number,
    visible: boolean
};

const ROUTINE_INTERVAL = 15 * 1000; // 15 seconds
const DEFAULT_USAGE_PLAN_ID = "default";

export default class UsagePlanService {
    private orm!: UsagePlanOrmService;

    private intervalId: NodeJS.Timeout | null = null;

    constructor(private context: Context) {
        context.onReady(() => {
            this.orm = this.context.usagePlanOrmService;
            this.intervalId = setInterval(this.doRoutineTasks.bind(this), ROUTINE_INTERVAL);
        });
    }

    async getDefaultUsagePlan(): Promise<UsagePlan | null> {
        return this.orm.getUsagePlan(DEFAULT_USAGE_PLAN_ID);
    }

    async getUsagePlanOrDefault(id: string | null): Promise<UsagePlan | null> {
        if (id == null)
            return this.getDefaultUsagePlan();
        return await this.orm.getUsagePlan(id);
    }

    async doRoutineTasks() {
        try {
            await this.checkPlansExpiration();
        } catch (e) {
            console.error('Failed to do routine tasks:', e);
        }
        try {
            await this.gainCreditsRoutine();
        } catch (e) {
            console.error('Failed to do routine tasks:', e);
        }
    }

    async checkPlansExpiration() {
        await this.context.vkUsersOrmService.setUserUsagePlanWhereExpiryIsBefore(null, new Date());
    }

    async gainCreditsRoutine() {
        const now = new Date();
        const users = await this.context.vkUsersOrmService.getUsersWithCreditsLessThanMax();
        const plans = new Map((await this.orm.getUsagePlans()).map(plan => [plan.id, plan] as [string, UsagePlan]));
        for (const user of users) {
            const planId = user.usagePlanId || DEFAULT_USAGE_PLAN_ID;
            if (planId == null || !plans.has(planId))
                continue;
            const plan = plans.get(planId)!;
            if (user.credits >= plan.maxCredits || plan.creditGainPeriodSeconds <= 0)
                continue;
            const secondsSinceLastCreditGain = Math.floor((now.getTime() - user.lastCreditGain.getTime()) / 1000);
            const gainCreditTimes = Math.floor(secondsSinceLastCreditGain / plan.creditGainPeriodSeconds);
            const creditsToGain = gainCreditTimes * plan.creditGainAmount;
            user.credits += creditsToGain;
            if (user.credits > plan.maxCredits)
                user.credits = plan.maxCredits;
            user.lastCreditGain = new Date(
                user.lastCreditGain.getTime() + gainCreditTimes * plan.creditGainPeriodSeconds * 1000
            );
            await this.context.vkUsersOrmService.saveUser(user);
        }
        await this.context.vkUsersOrmService.refreshLastCreditGainWhenMaxCredits(now);
    }

    async getTimeInSecondsRequiredToHaveCredits(userId: number, creditsAmount: number): Promise<number> {
        const user = await this.context.vkUsersService.getUser(userId);
        if (!user)
            throw new ServiceError("User not found");
        if (user.credits >= creditsAmount)
            return 0;
        const plan = await this.orm.getUsagePlan(user.usagePlanId || DEFAULT_USAGE_PLAN_ID);
        if (!plan || plan.creditGainPeriodSeconds <= 0 || plan.creditGainAmount <= 0)
            return Number.POSITIVE_INFINITY;
        const creditsNeeded = creditsAmount - user.credits;
        const fullCyclesNeeded = Math.ceil(creditsNeeded / plan.creditGainAmount);
        const secondsSinceLastCreditGain = Math.floor((Date.now() - user.lastCreditGain.getTime()) / 1000);
        return fullCyclesNeeded * plan.creditGainPeriodSeconds - secondsSinceLastCreditGain;
    }
}