import {Context} from "../Context";

export default class UserPermissionsService {
    constructor(private context: Context) {}

    async isUserPrivileged(peerId: number, userId: number): Promise<boolean> {
        const { chatAdminsOrmService, appCeosOrmService } = this.context;
        return await chatAdminsOrmService.isUserAdmin(peerId, userId) || await appCeosOrmService.exists(userId);
    }
}