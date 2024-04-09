import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import * as fs from "fs";
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

export async function optimizeForVkAudioMessage(audio: Buffer): Promise<Buffer> {
    const tempFilePath = join(tmpdir(), `temp_audio_${Date.now()}.opus`);

    try {
        await writeFileAsync(tempFilePath, audio);

        const outputFilePath = tempFilePath.replace('.opus', '_optimized.opus');

        return new Promise((resolve, reject) => {
            ffmpeg(tempFilePath)
                .audioCodec('libopus')
                .audioFrequency(16000)
                .audioBitrate(16)
                .audioChannels(1)
                .format('opus')
                .output(outputFilePath)
                .on('end', async () => {
                    try {
                        const optimizedAudio = await readFileAsync(outputFilePath);
                        fs.unlinkSync(tempFilePath);
                        fs.unlinkSync(outputFilePath);
                        resolve(optimizedAudio);
                    } catch (readError) {
                        reject(readError);
                    }
                })
                .on('error', (err) => {
                    console.error("ffmpeg error: " + err);
                    fs.unlinkSync(tempFilePath);
                    fs.unlinkSync(outputFilePath);
                    reject(err);
                })
                .run();
        });
    } catch (error) {
        throw new Error(`Failed to read/write temporary files: ${error}`);
    }
}