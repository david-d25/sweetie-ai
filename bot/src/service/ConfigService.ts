import {exit} from "node:process";
import * as process from "process";
import LoggingService, {Logger} from "./LoggingService";

export type AppConfig = {
    backendUrl: string;
    dbHost: string;
    dbName: string;
    dbPassword: string;
    dbPort: number | null;
    dbUser: string;
    openAiSecretKey: string;
    vkAccessToken: string;
    vkGroupId: number;
    metaphorApiKey: string;
    fileHostingPort: number;
    fileHostingUrlBase: string;
    fileHostingMaxStorageSizeBytes: number;
    mode: "production" | "development";
}

export default class ConfigService {
    private logger: Logger;

    constructor(private loggingService: LoggingService) {
        this.logger = loggingService.getRootLogger().newSublogger("ConfigService");
    }

    getEnv(key: string, defaultValue: string | null = null): string | null {
        return (key in process.env) ? process.env[key]! : defaultValue;
    }

    getNumericEnv(key: string, defaultValue: number | null = null): number | null {
        const result = this.getEnv(key);
        return result == null ? defaultValue : parseInt(result);
    }

    requireEnv(key: string): string {
        const result = this.getEnv(key);
        if (result == undefined) {
            console.error(`This app needs environment variable '${key}' to be set.`);
            exit(1);
        }
        return result;
    }

    requireNumericEnv(key: string): number {
        const result = this.getNumericEnv(key);
        if (result == null) {
            console.error(`This app needs environment variable '${key}' to be set.`);
            exit(1);
        }
        return result;
    }

    getAppConfig(): AppConfig {
        return {
            backendUrl: this.requireEnv('BACKEND_URL'),
            dbHost: this.requireEnv('DB_HOST'),
            dbName: this.requireEnv('DB_NAME'),
            dbPassword: this.requireEnv('DB_PASSWORD'),
            dbPort: this.getNumericEnv('DB_PORT'),
            dbUser: this.requireEnv('DB_USER'),
            openAiSecretKey: this.requireEnv('OPENAI_SECRET_KEY'),
            vkAccessToken: this.requireEnv('VK_ACCESS_TOKEN'),
            vkGroupId: this.requireNumericEnv('VK_GROUP_ID'),
            metaphorApiKey: this.requireEnv('METAPHOR_API_KEY'),
            fileHostingPort: this.requireNumericEnv('FILE_HOSTING_PORT'),
            fileHostingUrlBase: this.requireEnv('FILE_HOSTING_URL_BASE'),
            fileHostingMaxStorageSizeBytes: this.requireNumericEnv('FILE_HOSTING_MAX_STORAGE_SIZE_BYTES'),
            mode: this.readModeValue(this.requireEnv('BOT_MODE'))
        }
    }

    private readModeValue(value: string): "production" | "development" {
        if (value == "production" || value == "development") {
            return value;
        }
        this.logger.warn(`Invalid mode value: ${value}, using 'production'`);
        return "production";
    }
}