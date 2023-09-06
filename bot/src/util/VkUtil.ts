import {Attachment, DocumentAttachment} from "vk-io";

export function isChatId(peerId: number): boolean {
    return peerId > 2e9;
}

export function toUserFriendlySize(sizeBytes: number): string {
    if (sizeBytes < 1024)
        return `${sizeBytes} байт`;
    if (sizeBytes < 1024 * 1024)
        return `${Math.round(sizeBytes / 1024)} КБ`;
    if (sizeBytes < 1024 * 1024 * 1024)
        return `${Math.round(sizeBytes / 1024 / 1024)} МБ`;
    return `${Math.round(sizeBytes / 1024 / 1024 / 1024)} ГБ`;
}

export function getFileName(attachment: Attachment): string {
    if (attachment instanceof DocumentAttachment) {
        let result = (attachment.title || attachment.id.toString());
        if (!result.endsWith("." + (attachment.extension || "")))
            result += "." + (attachment.extension || "");
        return result;
    }
    return attachment.toString();
}

export function toUserFriendlyDate(date: Date): string {
    return `${("0" + date.getDate()).slice(-2)}.${("0" + (date.getMonth() + 1)).slice(-2)}.${date.getFullYear()} ${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;
}