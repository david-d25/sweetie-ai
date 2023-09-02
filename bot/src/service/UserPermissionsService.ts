import {Context} from "../Context";

export default class UserPermissionsService {
    constructor(private context: Context) {}

    async isUserPrivileged(peerId: number, userId: number): Promise<boolean> {
        const { chatAdminsOrmService, vkMessagesService } = this.context;
        const chatMembers = await vkMessagesService.getChatMembers(peerId);
        return !!chatMembers.find(it => it.memberId == userId && it.isAdmin)
            || await chatAdminsOrmService.isUserAdmin(peerId, userId);
    }
}