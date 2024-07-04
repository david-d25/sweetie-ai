import axios from "axios";
import {PhotoAttachment} from "vk-io";
import {InvocationContext} from "./AssistantFunction";

export async function downloadVkPhotoAttachment(
    invocationContext: InvocationContext,
    attachmentId: number
): Promise<Buffer> {
    const attachment = invocationContext.lookupAttachment(attachmentId);
    if (!attachment) {
        throw new Error("Could not find image with ID " + attachmentId);
    }
    if (attachment.type !== "photo") {
        throw new Error("Attachment with ID " + attachmentId + " is not a photo");
    }
    const r = await axios.get((attachment as PhotoAttachment).largeSizeUrl!, {responseType: "arraybuffer"});
    return Buffer.from(r.data);
}