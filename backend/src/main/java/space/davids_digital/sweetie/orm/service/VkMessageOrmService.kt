package space.davids_digital.sweetie.orm.service

import com.vk.api.sdk.deserializers.GsonDeserializer
import com.vk.api.sdk.objects.messages.MessageAttachment
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.MessagesChartModel
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.entity.VkMessageAttachmentEntity
import space.davids_digital.sweetie.orm.entity.VkMessageEntity
import space.davids_digital.sweetie.orm.repository.VkMessageRepository
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

@Service
class VkMessageOrmService(
    private val vkMessageRepository: VkMessageRepository
) {
    fun getChart(
        from: ZonedDateTime?,
        to: ZonedDateTime?,
        peerIdFilter: Long?,
        fromIdFilter: Long?,
        aggregationPeriodMinutes: Long
    ): MessagesChartModel {
        val projections = vkMessageRepository.countMessagesGroupedByNMinutesSorted(
            aggregationPeriodMinutes,
            from,
            to,
            peerIdFilter,
            fromIdFilter
        )
        val labels = ArrayList<ZonedDateTime>(projections.size)
        val counts = LongArray(projections.size)
        for ((i, p) in projections.withIndex()) {
            labels[i] = p.time.toInstant().atZone(ZoneId.systemDefault())
            counts[i] = p.count
        }
        return MessagesChartModel(
            from!!,
            to!!,
            aggregationPeriodMinutes,
            peerIdFilter,
            fromIdFilter,
            labels.toArray(arrayOfNulls<ZonedDateTime>(0)),
            counts
        )
    }

    fun getMessagesByPeerIdOrderByTimestamp(peerId: Long, pageable: Pageable): List<VkMessageModel> {
        return vkMessageRepository
            .getMessagesByPeerIdOrderByTimestamp(peerId, pageable)
            .stream()
            .map { toModel(it) }
            .toList()
    }

    fun getMessagesByTime(peerId: Long, fromTime: Instant, toTime: Instant): List<VkMessageModel> {
        return vkMessageRepository
            .findAllByPeerIdAndTimestampIsBetween(peerId, fromTime, toTime)
            .stream()
            .map { toModel(it) }
            .toList()
    }

    fun save(message: VkMessageModel) {
        vkMessageRepository.save(toEntity(message))
    }

    private fun toModel(entity: VkMessageEntity): VkMessageModel {
        return VkMessageModel(
            entity.conversationMessageId,
            entity.peerId,
            entity.fromId,
            entity.timestamp,
            entity.text,
            entity.forwardMessages.map(::toModel),
            entity.attachments.map { GsonDeserializer.deserialize(it.attachmentDtoJson, MessageAttachment::class.java) }
        )
    }

    private fun toEntity(model: VkMessageModel): VkMessageEntity {
        val entity = VkMessageEntity().also {
            it.conversationMessageId = model.conversationMessageId
            it.peerId = model.peerId
            it.fromId = model.fromId
            it.text = model.text
            it.forwardMessages = model.forwardedMessages.map(::toEntity)
            it.attachments = model.attachmentDtos.mapIndexed { dtoIndex, dto ->
                VkMessageAttachmentEntity().also { a ->
                    a.conversationMessageId = model.conversationMessageId
                    a.peerId = model.peerId
                    a.orderIndex = dtoIndex
                    a.attachmentDtoJson = dto.toString()
                }
            }
        }
        return entity
    }
}
