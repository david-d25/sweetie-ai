package space.davids_digital.sweetie.command

import jakarta.transaction.Transactional
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.integration.vk.VkUtils
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.repository.UsagePlanRepository
import space.davids_digital.sweetie.orm.repository.VkUserRepository
import java.time.ZonedDateTime

@Component
class GrantCommand(
    private val vkMessageService: VkMessageService,
    private val usagePlanRepository: UsagePlanRepository,
    private val vkUserRepository: VkUserRepository
): Command {
    companion object {
        private val log = LoggerFactory.getLogger(GrantCommand::class.java)
    }

    override fun getNames(): Array<String> {
        return arrayOf("grant")
    }

    override fun getUsage(): String {
        return "grant (plan)[:days] (user)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return true
    }

    @Transactional
    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        if (rawArguments.isBlank()) {
            return handleHelp(message)
        }
        val firstArgument = rawArguments.split(" ")[0]
        val planId = firstArgument.split(":")[0]
        val days = firstArgument.split(":").getOrNull(1)?.toIntOrNull()
        val rest = rawArguments.drop(firstArgument.length).trim()

        var memberId = VkUtils.extractMemberId(rest)
        if (memberId == null) {
            memberId = message.forwardedMessages.firstOrNull()?.fromId
        }
        if (memberId == null) {
            return handleHelp(message)
        }

        val planExists = withContext(Dispatchers.IO) {
            usagePlanRepository.existsById(planId)
        }
        if (!planExists) {
            vkMessageService.send(message.peerId, "Нет такого плана")
            return
        }

        val expiry = days?.let { ZonedDateTime.now().plusDays(it.toLong()) }
        withContext(Dispatchers.IO) {
            vkUserRepository.setUsagePlan(memberId, planId, expiry)
        }
        log.info("User ${message.fromId} set plan '$planId' to $memberId ${days?.let { "for $it days" } ?: "forever"}")

        val userTag = if (memberId > 0) "[id$memberId|Ты]" else "Ты"
        val expiryText = expiry?.let { "до ${it.dayOfMonth}.${it.monthValue}.${it.year}" } ?: "навсегда"
        val planTitle = withContext(Dispatchers.IO) {
            usagePlanRepository.findById(planId).get().title
        }
        vkMessageService.send(message.peerId, "$userTag получаешь Sweetie AI $planTitle $expiryText")
    }

    private fun handleHelp(message: VkMessageModel) {
        val text = """
            Так пиши:
            /sweet grant (plan)[:days] [user]
        """.trimIndent()
        vkMessageService.send(message.peerId, text)
    }
}