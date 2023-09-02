import axios, {AxiosError} from "axios";

export function createOpenAiWrapperError(e: unknown): Error {
    if (axios.isAxiosError(e)) {
        const axiosError = e as AxiosError;
        if (axiosError.response && axiosError.response.data) {
            const data = axiosError.response.data as any;
            const message = data.error.message || axiosError.message;
            return new Error("OpenAI: " + message)
        } else {
            return new Error("API call failed: " + axiosError.message);
        }
    } else if (e instanceof Error) {
        const error = e as Error
        return new Error("Service call failed: " + error.message)
    }
    return new Error("Unknown problem, please check logs")
}
