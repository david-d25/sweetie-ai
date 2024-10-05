package space.davids_digital.sweetie.integration.openai

import java.util.*

object OpenAiUtils {
    fun ByteArray.toBase64PngDataUrl(): String {
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(this)
    }
}