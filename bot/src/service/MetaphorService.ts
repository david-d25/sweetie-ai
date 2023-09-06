import {Context} from "../Context";
import axios, {AxiosError, AxiosResponse} from "axios";
import ServiceError from "../ServiceError";

export default class MetaphorService {
    private static SEARCH_ENDPOINT = "https://api.metaphor.systems/search";
    private static GET_CONTENT_ENDPOINT = "https://api.metaphor.systems/contents"

    private apiKey!: string;

    constructor(private context: Context) {
        context.onReady(() => this.init());
    }

    private init() {
        this.apiKey = this.context.configService.requireEnv('METAPHOR_API_KEY')!;
    }

    async search(query: string, nResults: number = 3): Promise<MetaphorSearchResult[]> {
        const body: any = {};
        body['query'] = query;
        body['numResults'] = nResults;

        try {
            const response = await axios.post(MetaphorService.SEARCH_ENDPOINT, body, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return this.parseSearchResults(response);
        } catch (e) {
            this.handleErrorGeneric(e);

        }
    }

    async getContent(documentId: string): Promise<string> {
        try {
            const response = await axios.get(MetaphorService.GET_CONTENT_ENDPOINT + "?ids=" + documentId, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Accept': 'application/json',
                }
            });
            return this.extractFirstContent(response);
        } catch (e) {
            this.handleErrorGeneric(e);
        }
    }

    private handleErrorGeneric(e: any): never {
        if (axios.isAxiosError(e)) {
            const axiosError = e as AxiosError
            if (axiosError.response && axiosError.response.data) {
                const data = axiosError.response.data as any;
                const message = data.error || axiosError.message;
                throw new ServiceError("Metaphor: " + message)
            } else {
                throw new ServiceError("API call failed: " + axiosError.message)
            }
        } else if (e instanceof Error) {
            const error = e as Error
            throw new ServiceError("Service call failed: " + error.message)
        } else {
            throw new ServiceError("Unknown problem, please check logs")
        }
    }

    private extractFirstContent(response: AxiosResponse): string {
        const data = response.data;
        return data['contents'][0]['extract'];
    }

    private parseSearchResults(response: AxiosResponse): MetaphorSearchResult[] {
        const data = response.data;
        const results: MetaphorSearchResult[] = [];
        for (const result of data['results']) {
            results.push({
                url: result.url,
                title: result.title,
                publishedDate: result.publishedDate,
                score: result.score,
                metaphorSearchResultId: result.id
            });
        }
        return results;
    }
}

export type MetaphorSearchResult = {
    url: string,
    title: string,
    publishedDate: string,
    score: number,
    metaphorSearchResultId: string
}