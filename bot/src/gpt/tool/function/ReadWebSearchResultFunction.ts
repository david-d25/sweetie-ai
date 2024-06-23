import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";

export default class ReadWebSearchResultFunction implements AssistantFunction {
    constructor(private context: Context) {}

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const searchResultId = args['search_result_id'];
        const result = await this.context.metaphorService.getContent(searchResultId);
        return `Content from page:\n"""\n${result}\n"""`;
    }

    getDescription(): string {
        return "Retrieves the content of a web search result. Use 'web_search' to search the web first.";
    }

    getName(): string {
        return "read_web_search_result";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                search_result_id: {
                    type: "string",
                    description: "The ID if search result that you will get after calling 'web_search'"
                }
            },
            required: ["search_result_id"]
        }
    }
}