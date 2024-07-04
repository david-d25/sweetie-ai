import {Context} from "../Context";
import {Logger} from "./LoggingService";
import axios, {AxiosError} from "axios";
import ServiceError from "../ServiceError";
import FormData from "form-data";

export type AspectRatio = "16:9" | "1:1" | "21:9" | "2:3" | "3:2" | "4:5" | "5:4" | "9:16" | "9:21";

export default class StabilityAiService {
    private logger!: Logger;
    private apiKey!: string;

    constructor(private context: Context) {
        this.context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger('StabilityAiService');
            this.apiKey = context.configService.getAppConfig().stabilityAiApiKey;
        });
    }

    async generateImage(
        prompt: string,
        negativePrompt: string | null = null,
        aspectRatio: AspectRatio = "1:1"
    ): Promise<Buffer> {
        const url = "https://api.stability.ai/v2beta/stable-image/generate/ultra";
        const form = new FormData();
        form.append('prompt', prompt);
        if (negativePrompt) {
            form.append('negative_prompt', negativePrompt);
        }
        form.append('aspect_ratio', aspectRatio);
        form.append('output_format', "png");
        try {
            const response = await axios.post(url, form, this.createConfig());
            return Buffer.from(response.data);
        } catch (e: unknown) {
            this.logger.error("Failed to generate image");
            console.error(e);
            throw this.createStabilityAiWrapperError(e);
        }
    }

    async searchAndReplace(
        image: Buffer,
        prompt: string,
        searchPrompt: string,
        negativePrompt: string | null = null
    ): Promise<Buffer> {
        const url = "https://api.stability.ai/v2beta/stable-image/edit/search-and-replace";
        const form = new FormData();
        form.append('image', image, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        form.append('prompt', prompt);
        form.append('search_prompt', searchPrompt);
        if (negativePrompt) {
            form.append('negative_prompt', negativePrompt);
        }
        form.append('output_format', "png");
        try {
            const response = await axios.post(url, form, this.createConfig());
            return Buffer.from(response.data);
        } catch (e: unknown) {
            this.logger.error("Failed to search and replace image");
            console.error(e);
            throw this.createStabilityAiWrapperError(e);
        }
    }

    async removeBackground(image: Buffer): Promise<Buffer> {
        const url = "https://api.stability.ai/v2beta/stable-image/edit/remove-background";
        const form = new FormData();
        form.append('image', image, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        form.append('output_format', "png");
        try {
            const response = await axios.post(url, form, this.createConfig());
            return Buffer.from(response.data);
        } catch (e: unknown) {
            this.logger.error("Failed to remove image background");
            console.error(e);
            throw this.createStabilityAiWrapperError(e);
        }
    }

    async sketch(
        image: Buffer,
        prompt: string,
        controlStrength: number = 0.7,
        negativePrompt: string | null = null
    ): Promise<Buffer> {
        const url = "https://api.stability.ai/v2beta/stable-image/control/sketch";
        const form = new FormData();
        form.append('image', image, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        form.append('prompt', prompt);
        form.append('control_strength', controlStrength.toString());
        if (negativePrompt) {
            form.append('negative_prompt', negativePrompt);
        }
        form.append('output_format', "png");
        try {
            const response = await axios.post(url, form, this.createConfig());
            return Buffer.from(response.data);
        } catch (e: unknown) {
            this.logger.error("Failed to draw from sketch");
            console.error(e);
            throw this.createStabilityAiWrapperError(e);
        }
    }

    async structure(
        image: Buffer,
        prompt: string,
        controlStrength: number = 0.7,
        negativePrompt: string | null = null
    ): Promise<Buffer> {
        const url = "https://api.stability.ai/v2beta/stable-image/control/structure";
        const form = new FormData();
        form.append('image', image, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        form.append('prompt', prompt);
        form.append('control_strength', controlStrength.toString());
        if (negativePrompt) {
            form.append('negative_prompt', negativePrompt);
        }
        form.append('output_format', "png");
        try {
            const response = await axios.post(url, form, this.createConfig());
            return Buffer.from(response.data);
        } catch (e: unknown) {
            this.logger.error("Failed to control structure");
            console.error(e);
            throw this.createStabilityAiWrapperError(e);
        }
    }

    private createConfig(): object {
        return {
            responseType: 'arraybuffer',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': "multipart/form-data",
                'Accept': "image/*"
            }
        }
    }

    private createStabilityAiWrapperError(e: unknown): Error {
        if (axios.isAxiosError(e)) {
            const axiosError = e as AxiosError;
            if (axiosError.response && axiosError.response.data) {
                const data = axiosError.response.data as any;
                const message = Array.isArray(data.errors) ? data.errors.join(", ") : axiosError.message;
                return new ServiceError("StabilityAI: " + message)
            } else {
                return new ServiceError("API call failed: " + axiosError.message);
            }
        } else if (e instanceof Error) {
            const error = e as Error
            return new ServiceError("Service call failed: " + error.message)
        }
        return new ServiceError("Unknown problem, please check logs")
    }
}