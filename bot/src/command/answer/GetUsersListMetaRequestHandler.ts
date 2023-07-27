import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";
import {GroupsGroupFull, UsersUserFull} from "vk-io/lib/api/schemas/objects";

export default class GetUsersListMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName == 'getUsersList';
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        try {
            await this.handleUnsafe(message, response);
        } catch (e) {
            console.error(e);
            response.metaRequestResults.push("System: 'getUsersList' has thrown an exception. Tell user that you can't get user list right now. You may also ask David to check the logs.");
        }
    }

    private async handleUnsafe(message: VkMessage, response: ResponseMessage): Promise<void> {
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
        response.metaRequestResults.push(`'getUsersList' result: ${JSON.stringify(membersDto)}`);
    }

}