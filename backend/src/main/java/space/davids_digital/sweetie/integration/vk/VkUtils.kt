package space.davids_digital.sweetie.integration.vk

object VkUtils {
    fun extractMemberId(text: String): Long? {
        val userRegex = Regex("\\[?id(\\d+)\\|?")
        val groupRegex = Regex("\\[?club(\\d+)\\|?")
        return userRegex.find(text)?.groupValues?.get(1)?.toLongOrNull()
            ?: groupRegex.find(text)?.groupValues?.get(1)?.toLongOrNull()?.unaryMinus()
    }
}