import {Context} from "../Context";
import ConfigService from "./ConfigService";
import axios from "axios";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";

export type FineTuningJobStatus = "created" | "pending" | "running" | "succeeded" | "failed" | "cancelled";

export type FineTuningJob = {
    id: string,
    createdAt: Date,
    finishedAt: Date,
    baseModel: string,
    fineTunedModel: string | null,
    organizationId: string,
    status: FineTuningJobStatus,
    hyperparameters: {
        nEpochs: number,
    },
    trainingFile: string,
    validationFile: string | null,
    resultFiles: string[],
    trainedTokens: number
}

export type FineTuningEvent = {
    id: string,
    createdAt: Date,
    level: string,
    message: string,
    data: any,
    type: string,
}

export default class FineTuningService {
    private config!: ConfigService;
    private apiKey!: string;

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
            this.apiKey = this.config.requireEnv('OPENAI_SECRET_KEY');
        });
    }

    async *streamJobs(): AsyncGenerator<FineTuningJob> {
        let lastId = null;
        while (true) {
            const jobs = await this.listJobs(lastId);
            if (jobs.list.length === 0) {
                break;
            }
            for (const job of jobs.list) {
                yield job;
            }
            if (!jobs.hasMore) {
                break;
            }
            lastId = jobs.list[jobs.list.length - 1].id;
        }
    }

    async listJobs(
        afterId: string | null = null,
        limit: number | null = null
    ): Promise<{
        list: FineTuningJob[],
        hasMore: boolean
    }> {
        const apiUrl = "https://api.openai.com/v1/fine_tuning/jobs";
        const config = this.createAxiosJsonConfig();
        const body: any = {};
        if (afterId) {
            body['after'] = afterId;
        }
        if (limit) {
            body['limit'] = limit;
        }
        try {
            const response = await axios.get(apiUrl, config);
            const result = response.data['data'].map(
                (object: { [key:string]: any }) => this.toFineTuningJobModel(object)
            );
            const hasMore = response.data['has_more'];
            return { list: result, hasMore };
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async createJob(
        baseModel: string,
        trainingFileId: string,
        validationFileId: string | null = null
    ): Promise<FineTuningJob> {
        const apiUrl = "https://api.openai.com/v1/fine_tuning/jobs";
        const config = this.createAxiosJsonConfig();
        const body: any = {};
        body['model'] = baseModel;
        body['training_file'] = trainingFileId;
        if (validationFileId) {
            body['validation_file'] = validationFileId;
        }
        try {
            const response = await axios.post(apiUrl, body, config);
            return this.toFineTuningJobModel(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async getJob(id: string): Promise<FineTuningJob> {
        const apiUrl = "https://api.openai.com/v1/fine_tuning/jobs/" + id;
        const config = this.createAxiosJsonConfig();
        try {
            const response = await axios.get(apiUrl, config);
            return this.toFineTuningJobModel(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async cancelJob(id: string): Promise<FineTuningJob> {
        const apiUrl = "https://api.openai.com/v1/fine_tuning/jobs/" + id + "/cancel";
        const config = this.createAxiosJsonConfig();
        try {
            const response = await axios.post(apiUrl, {}, config);
            return this.toFineTuningJobModel(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async *streamEvents(jobId: string): AsyncGenerator<FineTuningEvent> {
        let lastId = null;
        while (true) {
            const events = await this.listEvents(jobId, lastId);
            if (events.list.length === 0) {
                break;
            }
            for (const event of events.list) {
                yield event;
            }
            if (!events.hasMore) {
                break;
            }
            lastId = events.list[events.list.length - 1].id;
        }
    }

    async waitJobStatus(jobId: string, statuses: FineTuningJobStatus[], timeoutSeconds: number): Promise<FineTuningJob> {
        let delayMs = 2000;
        while (true) {
            const job = await this.getJob(jobId);
            if (statuses.includes(job.status)) {
                return job;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
            if (delayMs < 16000) {
                delayMs *= 2;
            }
            timeoutSeconds -= delayMs / 1000;
            if (timeoutSeconds <= 0) {
                throw new Error(`Timeout waiting for job status '${statuses}'`);
            }
        }
    }

    async listEvents(
        jobId: string,
        afterId: string | null = null,
        limit: number | null = null
    ): Promise<{
        list: FineTuningEvent[],
        hasMore: boolean
    }> {
        const apiUrl = "https://api.openai.com/v1/fine_tuning/jobs/" + jobId + "/events";
        const config = this.createAxiosJsonConfig();
        const body: any = {};
        if (afterId) {
            body['after'] = afterId;
        }
        if (limit) {
            body['limit'] = limit;
        }
        try {
            const response = await axios.get(apiUrl, config);
            const result = response.data['data'].map(
                (object: { [key:string]: any }) => this.toFineTuningEventModel(object)
            );
            const hasMore = response.data['has_more'];
            return { list: result, hasMore };
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    private toFineTuningEventModel(object: { [key:string]: any }): FineTuningEvent {
        return {
            id: object['id'],
            createdAt: new Date(+object['created_at'] * 1000),
            level: object['level'],
            message: object['message'],
            data: object['data'],
            type: object['type'],
        }
    }

    private toFineTuningJobModel(object: { [key:string]: any }): FineTuningJob {
        return {
            id: object['id'],
            createdAt: new Date(+object['created_at'] * 1000),
            finishedAt: new Date(+object['finished_at'] * 1000),
            baseModel: object['model'],
            fineTunedModel: object['fine_tuned_model'],
            organizationId: object['organization_id'],
            status: object['status'],
            hyperparameters: {
                nEpochs: +object['hyperparameters']['n_epochs'],
            },
            trainingFile: object['training_file'],
            validationFile: object['validation_file'],
            resultFiles: object['result_files'],
            trainedTokens: +object['trained_tokens'],
        }
    }

    private createAxiosJsonConfig(headers: { [key:string]: string } = {}): object {
        return {
            headers: {
                ...headers,
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': "application/json; charset=utf-8"
            }
        };
    }
}