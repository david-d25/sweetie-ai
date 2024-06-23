export default class LoggingService {
    private static instance: Logger;
    getRootLogger(): Logger {
        if (LoggingService.instance === undefined) {
            LoggingService.instance = new LoggerImpl([]);
        }
        return LoggingService.instance;
    }
}

class LoggerImpl implements Logger {
    private static RAINBOW_CODES = [5, 4, 95, 94];
    private static MESSAGE_COLOR = 6;
    private static DEBUG_COLOR = 6;
    private static INFO_COLOR = 2;
    private static WARN_COLOR = 3;
    private static ERROR_COLOR = 1;

    constructor(private prefixes: string[]) {}

    debug(message: string): void {
        this.log(message, "DEBUG", LoggerImpl.DEBUG_COLOR);
    }

    error(message: string): void {
        this.log(message, "ERROR", LoggerImpl.ERROR_COLOR);
    }

    info(message: string): void {
        this.log(message, " INFO", LoggerImpl.INFO_COLOR);
    }

    warn(message: string): void {
        this.log(message, " WARN", LoggerImpl.WARN_COLOR);
    }

    newSublogger(prefix: string): Logger {
        return new LoggerImpl([...this.prefixes, prefix]);
    }

    private log(message: string, logLevel: string, logLevelColor: number): void {
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');

        let text = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        text += this.paint(" " + logLevel, logLevelColor);
        for (const [i, prefix] of this.prefixes.entries()) {
            const color = LoggerImpl.RAINBOW_CODES[i % LoggerImpl.RAINBOW_CODES.length];
            text += " [" + this.paint(prefix, color) + "]";
        }
        text += " " + this.paint(message, LoggerImpl.MESSAGE_COLOR);
        console.log(text);
    }

    private paint(text: string, color: number): string {
        return `\x1b[3${color}m${text}\x1b[0m`;
    }
}

export interface Logger {
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    debug(message: string): void;
    newSublogger(prefix: string): Logger;
}