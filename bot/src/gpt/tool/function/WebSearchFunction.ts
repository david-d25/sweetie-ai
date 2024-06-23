import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";

export default class WebSearchFunction implements AssistantFunction {
    constructor(private context: Context) {}

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const query = args['query'];
        let numResults = +args['num_results'] || 3;
        if (isNaN(numResults))
            numResults = 3;
        if (numResults < 1)
            numResults = 1;
        if (numResults > 10)
            numResults = 10;
        const results = await this.context.metaphorService.search(query, numResults);
        return `Result of web search:\n"""\n${JSON.stringify(results)}\n"""`;
    }

    getDescription(): string {
        return "Searches the web and returns search results. " +
            "After calling this, call 'read_web_search_result' to see " +
            "the content of a specific search result.";
    }

    getName(): string {
        return "web_search";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The query to search for."
                },
                num_results: {
                    type: "integer",
                    description: "The number of search results to return."
                }
            },
            required: ["query"]
        };
    }

}