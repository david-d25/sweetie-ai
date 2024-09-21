package space.davids_digital.sweetie.command

import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.UsagePlanOrmService
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import java.time.format.DateTimeFormatter
import kotlin.math.round

@Component
class PlanCommand(
    private val vkMessagesService: VkMessagesService,
    private val usagePlanOrmService: UsagePlanOrmService,
    private val vkUserOrmService: VkUserOrmService

): Command {
    override fun getNames(): Array<String> {
        return arrayOf("plan")
    }

    override fun getUsage(): String {
        return "plan (...)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return true
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val subCommand = rawArguments.split(" ")[0]
        when (subCommand) {
            "" -> handleDefault(message)
            "list" -> handleList(message)
            "help" -> handleHelp(message)
            else -> handleHelp(message)
        }
    }

    private fun handleDefault(message: VkMessageModel) {
        val user = vkUserOrmService.getById(message.fromId) ?: throw CommandException("Пользователь не найден")
        val plan = usagePlanOrmService.getOrDefault(user.usagePlanId, "default")
        val planTitle = plan?.title ?: "(no plan)"
        val builder = StringBuilder()
        builder.append("⚡ Sweetie AI $planTitle\n")
        builder.append("\uD83E\uDE99 Кредиты: ${user.credits}")
        if (plan != null) {
            builder.append("/${plan.maxCredits}")
        }
        builder.append("\n")
        if (plan != null) {
            if (plan.creditGainPeriodSeconds > 0) {
                val creditsGainPerHour = round(
                    plan.creditGainAmount.toDouble()/plan.creditGainPeriodSeconds * 3600 * 10
                ) / 10
                builder.append("\uD83D\uDCC8 Восполнение: $creditsGainPerHour к/ч\n")
            }
            if (user.usagePlanExpiry != null) {
                val expiryText = user.usagePlanExpiry.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
                builder.append("\uD83D\uDCC6 Действует до $expiryText\n")
            } else {
                builder.append("♾\uFE0F Действует вечно\n")
            }
        }
        vkMessagesService.send(message.peerId, builder.toString())
    }

    private fun handleList(message: VkMessageModel) {
        val plans = usagePlanOrmService.findAll()
            .filter { it.visible }
            .sortedBy { it.creditGainAmount.toDouble()/it.creditGainPeriodSeconds }
        val builder = StringBuilder()
        builder.append("Планы:\n")
        plans.forEach {
            val creditsGainPerHour = round(it.creditGainAmount.toDouble()/it.creditGainPeriodSeconds * 3600 * 10) / 10
            builder.append("- ${it.title} ($creditsGainPerHour к/ч, макс. ${it.maxCredits})\n")
        }
        vkMessagesService.send(message.peerId, builder.toString())
    }

    private fun handleHelp(message: VkMessageModel) {
        val text = """
            Команды:
            /sweet plan
            /sweet plan list
            /sweet plan help
        """.trimIndent()
        vkMessagesService.send(message.peerId, text)
    }
}