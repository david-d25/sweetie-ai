import {Context} from "../Context";
import {AppConfig} from "./ConfigService";
import express, {Express} from "express";
import ServiceError from "../ServiceError";

type HostedFile = {
    id: number;
    name: string;
    accessKey: string;
    content: Buffer;
    hostUntil: Date;
}

export default class TemporaryFileHostService {
    private config!: AppConfig;
    private server!: Express;
    private idCounter = 0;
    private files = new Map<number, HostedFile>();

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService.getAppConfig();
            this.startListeningForExpiredFiles();
            this.init();
        });
    }

    private init() {
        this.server = express();
        this.server.get('/hosted_files/:file_id', (req, res) => {
            const fileId = parseInt(req.params.file_id);
            const accessKey = req.query.access_key as string;
            const hostedFile = this.files.get(fileId);
            if (!hostedFile) {
                res.status(404).send('Not found');
                return;
            }
            if (hostedFile.accessKey != accessKey) {
                res.status(403).send('Access denied');
                return;
            }
            res.setHeader('Content-Disposition', `attachment; filename="${hostedFile.name}"`);
            res.send(hostedFile.content);
        });
        const port = this.config.fileHostingPort;
        this.server.listen(port, () => {
            console.log(`File hosting server listening at port ${port}, url base: ${this.config.fileHostingUrlBase}`)
        });
    }

    addFile(name: string, content: Buffer, hostingTimeSeconds: number): string {
        this.ensureStorageSpace(content.length);
        const id = this.idCounter++;
        const accessKey = this.generateAccessKey();
        const hostUntil = new Date(Date.now() + hostingTimeSeconds * 1000);
        const hostedFile: HostedFile = {
            id: id,
            name: name,
            accessKey: accessKey,
            content: content,
            hostUntil: hostUntil
        };
        this.files.set(id, hostedFile);
        console.log(`Added file '${name}' with id ${id}, size ${this.userFriendlySize(content.length)}, will be hosted for ${hostingTimeSeconds} seconds`);
        console.log(`Memory usage: ${this.userFriendlySize(this.getFilesMemoryUsageBytes())} / ${this.userFriendlySize(this.config.fileHostingMaxStorageSizeBytes)}`);
        return this.createDownloadLink(hostedFile);
    }

    private ensureStorageSpace(requiredBytes: number) {
        while (this.getFilesMemoryUsageBytes() + requiredBytes > this.config.fileHostingMaxStorageSizeBytes) {
            const oldestFile = this.getOldestFile();
            if (!oldestFile) {
                throw new ServiceError(`Not enough storage space for, required ${this.userFriendlySize(requiredBytes)}`);
            }
            this.files.delete(oldestFile.id);
            console.log(`Deleted file ${oldestFile.name} with id ${oldestFile.id}, size ${this.userFriendlySize(oldestFile.content.length)}, to free up space for ${this.userFriendlySize(requiredBytes)}`);
        }
    }

    private startListeningForExpiredFiles() {
        setInterval(() => {
            const now = new Date();
            let cleanedUpMemory = 0;
            for (const [id, hostedFile] of this.files.entries()) {
                if (hostedFile.hostUntil < now) {
                    this.files.delete(id);
                    cleanedUpMemory += hostedFile.content.length;
                    console.log(`Deleted file ${hostedFile.name} with id ${id}, size ${this.userFriendlySize(hostedFile.content.length)}`);
                }
            }
            if (cleanedUpMemory != 0)
                console.log(`Cleaned up ${this.userFriendlySize(cleanedUpMemory)} of memory, usage: ${this.userFriendlySize(this.getFilesMemoryUsageBytes())} / ${this.userFriendlySize(this.config.fileHostingMaxStorageSizeBytes)}`);
        }, 2500);
    }

    private getOldestFile(): HostedFile | undefined {
        let result: HostedFile | undefined = undefined;
        for (const hostedFile of this.files.values()) {
            if (result == undefined || hostedFile.hostUntil < result.hostUntil) {
                result = hostedFile;
            }
        }
        return result;
    }

    private userFriendlySize(sizeBytes: number) {
        if (sizeBytes < 1024) {
            return `${sizeBytes} bytes`;
        }
        if (sizeBytes < 1024 * 1024) {
            return `${Math.round(sizeBytes / 1024)} KiB`;
        }
        if (sizeBytes < 1024 * 1024 * 1024) {
            return `${Math.round(sizeBytes / 1024 / 1024)} MiB`;
        }
        return `${Math.round(sizeBytes / 1024 / 1024 / 1024)} GiB`;
    }

    private getFilesMemoryUsageBytes() {
        let result = 0;
        for (const hostedFile of this.files.values()) {
            result += hostedFile.content.length;
        }
        return result;
    }

    private createDownloadLink(hostedFile: HostedFile) {
        let urlBase = this.config.fileHostingUrlBase;
        if (!urlBase.endsWith('/'))
            urlBase += '/';
        return urlBase + 'hosted_files/' + hostedFile.id + '?access_key=' + hostedFile.accessKey;
    }

    private generateAccessKey() {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += characters[Math.floor(Math.random() * characters.length)];
        }
        return result;
    }
}