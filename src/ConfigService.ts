export default class ConfigService {
    getEnv(key: string): string | undefined {
        return process.env[key];
    }
}