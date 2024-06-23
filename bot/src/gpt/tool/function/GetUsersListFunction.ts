import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {GroupsGroupFull, UsersUserFull} from "vk-io/lib/api/schemas/objects";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";

export default class GetUsersListFunction implements AssistantFunction {
    private logger!: Logger;
    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("GetUsersListFunction");
        });
    }

    getDescription(): string {
        return "Gets list of all users in this chat.";
    }

    getName(): string {
        return "get_users_list";
    }

    getParameters(): AssistantObject | null {
        return null;
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        try {
            return await this.handleUnsafe(message);
        } catch (e) {
            this.logger.error("Failed to get users list: " + e);
            throw new Error("Failed to fetch user list. You probably don't have admin rights in this chat");
        }
    }

    private async handleUnsafe(message: VkMessage): Promise<string> {
        const members = await this.context.vk.api.messages.getConversationMembers({
            peer_id: message.peerId
        });
        const userById = new Map<number, UsersUserFull>();
        const groupById = new Map<number, GroupsGroupFull>();
        members.profiles?.forEach(it => userById.set(it.id, it));
        members.groups?.forEach(it => groupById.set(it.id!, it));
        const membersDto = members.items?.map(it => {
            const type = it.member_id! < 0 ? "group" : "user";
            const user = userById.get(it.member_id!);
            const group = groupById.get(-it.member_id!);
            return {
                memberId: it.member_id,
                firstName: type == "user" ? user.first_name : group?.name,
                lastName: type == "user" ? user.last_name : null,
                isAdmin: it.is_admin,
                type
            }
        });
        return JSON.stringify(membersDto);
    }
}