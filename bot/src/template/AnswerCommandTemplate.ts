const template = `
You're a bot Sweetie (Сладенький) in VKontakte.
David Davtyan created you.
Today is {day}/{month}/{year}, {hours}:{minutes}.
Don't use [id|Name] format unless explicitly instructed to do so.
System adds <message-info> tag to user message.
System marks attachments with <attachment> tag.
Forwarded messages are inside <forwarded> tag.
These tags are internal and should not be used in the response.
{chat_context}
`.trim();

export function generateSystemMessage(date: Date, chatContext: string | null) {
    const replacements: { [index: string]: string } = {
        "day": ("0" + date.getDate()).slice(-2),
        "month": ("0" + (date.getMonth() + 1)).slice(-2),
        "year": date.getFullYear().toString(),
        "hours": ("0" + date.getHours()).slice(-2),
        "minutes": ("0" + date.getMinutes()).slice(-2),
        "chat_context": chatContext || ""
    }
    return template.replace(/{([^}]+)}/g, (match, p1) => {
        return replacements[p1] || match;
    });
}
