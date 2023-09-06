import axios, {AxiosError} from "axios";
import ServiceError from "../ServiceError";

export function createOpenAiWrapperError(e: unknown): Error {
    if (axios.isAxiosError(e)) {
        const axiosError = e as AxiosError;
        if (axiosError.response && axiosError.response.data) {
            const data = axiosError.response.data as any;
            const message = data.error.message || axiosError.message;
            return new ServiceError("OpenAI: " + message)
        } else {
            return new ServiceError("API call failed: " + axiosError.message);
        }
    } else if (e instanceof Error) {
        const error = e as Error
        return new ServiceError("Service call failed: " + error.message)
    }
    return new ServiceError("Unknown problem, please check logs")
}
