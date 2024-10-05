package space.davids_digital.sweetie.util

import okhttp3.OkHttpClient
import okhttp3.Request
import org.slf4j.LoggerFactory
import java.io.IOException
import java.net.URI

object DownloadUtils {
    private val log = LoggerFactory.getLogger(DownloadUtils::class.java)

    fun download(uri: URI, maxRetries: Int = 3): ByteArray {
        return download(uri.toString(), maxRetries)
    }

    fun download(url: String, maxRetries: Int = 3): ByteArray {
        log.debug("Downloading: $url")
        val client = OkHttpClient()
        var attempt = 0

        while (attempt < maxRetries) {
            try {
                val request = Request.Builder().url(url).build()
                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    return response.body?.byteStream()?.readBytes() ?: throw IOException("Failed to read body bytes")
                } else {
                    throw IOException("HTTP error code: ${response.code}")
                }
            } catch (e: IOException) {
                log.warn("Failed to download image: ${e.message}, retrying...")
                attempt++
            }
        }
        throw IOException("Failed to download image after $attempt attempts")
    }
}