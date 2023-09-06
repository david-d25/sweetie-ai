import {Context} from "../Context";

export default class UserPermissionsService {
    constructor(private context: Context) {}

    async isUserPrivileged(peerId: number, userId: number): Promise<boolean> {
        const { chatAdminsOrmService } = this.context;
        return await chatAdminsOrmService.isUserAdmin(peerId, userId);
    }
}