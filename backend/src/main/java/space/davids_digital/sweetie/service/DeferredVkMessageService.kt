package space.davids_digital.sweetie.service

import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationContext
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.DeferredVkMessageModel
import space.davids_digital.sweetie.orm.repository.DeferredVkMessageRepository
import space.davids_digital.sweetie.orm.service.DeferredVkMessageOrmService
import java.time.Instant

@Service
class DeferredVkMessageService(
    private val deferredVkMessageRepository: DeferredVkMessageRepository,
    private val deferredVkMessageOrmService: DeferredVkMessageOrmService,
    private val vkMessageService: VkMessageService,
    private val applicationContext: ApplicationContext
) {
    companion object {
        private val log = LoggerFactory.getLogger(DeferredVkMessageService::class.java)
        private const val ROUTINE_DELAY = 3_000L
    }

    @Scheduled(fixedDelay = ROUTINE_DELAY)
    fun sendDueMessages() {
        val dueMessages = deferredVkMessageOrmService.findDueMessages()
        val thisService = applicationContext.getBean(DeferredVkMessageService::class.java)
        dueMessages.forEach {
            thisService.sendAndRemoveMessage(it)
        }
    }

    @Transactional
    fun sendAndRemoveMessage(message: DeferredVkMessageModel) {
        deferredVkMessageRepository.deleteById(message.id)
        vkMessageService.send(message.peerId, message.text)
        log.info("Sent scheduled message to ${message.peerId}")
    }

    fun scheduleMessage(toId: Long, text: String, delaySeconds: Long) {
        deferredVkMessageOrmService.save(DeferredVkMessageModel(
            id = 0,
            peerId = toId,
            text = text,
            sendAt = Instant.now().plusSeconds(delaySeconds)
        ))
    }
}