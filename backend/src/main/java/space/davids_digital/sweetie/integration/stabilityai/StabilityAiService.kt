package space.davids_digital.sweetie.integration.stabilityai

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import java.io.IOException

@Service
class StabilityAiService(
    @Qualifier("stabilityAiApiKey")
    private val apiKey: String,
) {
    companion object {
        private val log = LoggerFactory.getLogger(StabilityAiService::class.java)
        private val ASPECT_RATIOS = listOf("16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21")
        private val IMAGE_MEDIA_TYPE = "image/jpeg".toMediaTypeOrNull()
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(300, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun generate(prompt: String, negativePrompt: String? = null, aspectRatio: String = "1:1"): ByteArray {
        validateAspectRatio(aspectRatio)
        val params = mutableMapOf(
            "prompt" to prompt,
            "aspect_ratio" to aspectRatio,
            "output_format" to "png"
        )
        negativePrompt?.let { params["negative_prompt"] = it }
        return call("https://api.stability.ai/v2beta/stable-image/generate/ultra", params)
    }

    fun searchAndReplace(
        image: ByteArray,
        prompt: String,
        searchPrompt: String,
        negativePrompt: String? = null,
    ): ByteArray {
        val params = mutableMapOf(
            "prompt" to prompt,
            "search_prompt" to searchPrompt,
            "output_format" to "png"
        )
        negativePrompt?.let { params["negative_prompt"] = it }
        return call("https://api.stability.ai/v2beta/stable-image/edit/search-and-replace", params, image)
    }

    fun removeBackground(image: ByteArray): ByteArray {
        val params = mapOf("output_format" to "png")
        return call("https://api.stability.ai/v2beta/stable-image/edit/remove-background", params, image)
    }

    fun sketch(
        image: ByteArray,
        prompt: String,
        controlStrength: Double = 0.7,
        negativePrompt: String? = null,
    ): ByteArray {
        val params = mutableMapOf(
            "prompt" to prompt,
            "control_strength" to controlStrength.toString(),
            "output_format" to "png"
        )
        negativePrompt?.let { params["negative_prompt"] = it }
        return call("https://api.stability.ai/v2beta/stable-image/control/sketch", params, image)
    }

    fun structure(
        image: ByteArray,
        prompt: String,
        controlStrength: Double = 0.7,
        negativePrompt: String? = null,
    ): ByteArray {
        val params = mutableMapOf(
            "prompt" to prompt,
            "control_strength" to controlStrength.toString(),
            "output_format" to "png"
        )
        negativePrompt?.let { params["negative_prompt"] = it }
        return call("https://api.stability.ai/v2beta/stable-image/control/structure", params, image)
    }

    private fun validateAspectRatio(aspectRatio: String) {
        if (aspectRatio !in ASPECT_RATIOS) {
            throw IllegalArgumentException("Aspect ratio must be one of $ASPECT_RATIOS, but was $aspectRatio")
        }
    }

    private fun call(
        url: String,
        params: Map<String, String>,
        image: ByteArray? = null
    ): ByteArray {
        val request = buildRequest(url, params, image)
        return executeRequest(request)
    }

    private fun buildRequest(
        url: String,
        params: Map<String, String>,
        image: ByteArray? = null
    ): Request {
        val formBodyBuilder = MultipartBody.Builder().setType(MultipartBody.FORM)
        for ((key, value) in params) {
            formBodyBuilder.addFormDataPart(key, value)
        }
        image?.let {
            formBodyBuilder.addFormDataPart(
                "image", "image.jpg",
                it.toRequestBody(IMAGE_MEDIA_TYPE)
            )
        }
        val requestBody = formBodyBuilder.build()
        return Request.Builder()
            .url(url)
            .post(requestBody)
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("Accept", "image/*")
            .build()
    }

    private fun executeRequest(request: Request): ByteArray {
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorBody = response.body?.string()
                log.error("Request failed: ${response.code} - $errorBody")
                throw RuntimeException("StabilityAI: ${response.message} - $errorBody")
            }
            return response.body?.bytes() ?: throw IOException("Empty response body")
        }
    }
}
