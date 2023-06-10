export default class ConfigService {
    getEnv(key: string): string | undefined {
        return process.env[key];
    }

    requireEnv(key: string): string {
        const result = this.getEnv(key);
        if (result == undefined) {
            console.error(`This app needs environment variable '${key}' to be set.`);
            process.exit(1);
        }
        return result;
    }
}