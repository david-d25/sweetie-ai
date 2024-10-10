package space.davids_digital.sweetie.integration.vk

import com.vk.api.sdk.client.VkApiClient
import com.vk.api.sdk.client.actors.GroupActor
import com.vk.api.sdk.events.longpoll.GroupLongPollApi
import com.vk.api.sdk.objects.callback.MessageNew
import com.vk.api.sdk.objects.docs.GetMessagesUploadServerType
import com.vk.api.sdk.objects.messages.*
import com.vk.api.sdk.objects.messages.responses.GetConversationMembersResponse
import com.vk.api.sdk.objects.photos.Photo
import io.reactivex.rxjava3.subjects.PublishSubject
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.repository.VkMessageRepository
import space.davids_digital.sweetie.orm.service.VkMessageOrmService
import java.io.File
import java.time.Instant

@Service
class VkMessageService @Autowired constructor(
    private val vkApiClient: VkApiClient,
    private val vkGroupActor: GroupActor,
    private val vkMessageOrmService: VkMessageOrmService,
    private val vkMessageRepository: VkMessageRepository,
    @Qualifier("vkGroupId")
    private val vkGroupId: Long
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkMessageService::class.java)
        private const val MAX_ATTACHMENTS_PER_MESSAGE = 10
    }

    private val messageStream = PublishSubject.create<VkMessageModel>()

    @PostConstruct
    private fun initLongPolling() {
        log.info("Init long polling")
        vkApiClient.groups().setLongPollSettings(vkGroupActor).enabled(true).messageEvent(true).execute()
        val handler = LongPollHandler(vkApiClient, vkGroupActor, 25) {
            try {
                val message = toModel(it.`object`.message)
                vkMessageOrmService.save(message)
                messageStream.onNext(message)
            } catch (e: Exception) {
                log.error("Failed to process an incoming message", e)
            }
        }
        handler.run()
    }

    fun getMessageStream() = messageStream

    fun uploadVoiceMessageAttachment(toId: Long, voiceMessage: ByteArray): MessageAttachment {
        log.info("Uploading voice message to $toId")
        val uploadUrl = vkApiClient.docs().getMessagesUploadServer(vkGroupActor)
            .peerId(toId.toInt())
            .type(GetMessagesUploadServerType.AUDIO_MESSAGE)
            .execute()
            .uploadUrl
            .toString()
        val tempFile = File.createTempFile("vk-voice-message", ".ogg")
        tempFile.deleteOnExit()
        tempFile.writeBytes(voiceMessage)
        val response = vkApiClient.upload().doc(uploadUrl, tempFile).execute()
        tempFile.delete()
        val attachments = vkApiClient.docs().save(vkGroupActor, response.file).execute()
        return MessageAttachment()
            .setType(MessageAttachmentType.AUDIO_MESSAGE)
            .setAudioMessage(attachments.audioMessage)
    }

    fun indicateActivity(peerId: Long, type: SetActivityType) {
        vkApiClient.messages().setActivity(vkGroupActor).peerId(peerId).type(type).execute()
    }

    fun uploadPhotoAttachment(toId: Long, image: ByteArray): MessageAttachment {
        log.info("Uploading an image to $toId")
        val uploadUrl = vkApiClient.photos().getMessagesUploadServer(vkGroupActor)
            .peerId(toId.toInt())
            .execute()
            .uploadUrl
            .toString()
        val tempFile = File.createTempFile("vk-image", ".jpg")
        tempFile.deleteOnExit()
        tempFile.writeBytes(image)
        val response = vkApiClient.upload().photoMessage(uploadUrl, tempFile).execute()
        val attachments = vkApiClient.photos()
            .saveMessagesPhoto(vkGroupActor, response.photo)
            .server(response.server)
            .hash(response.hash)
            .execute()
        tempFile.delete()
        return attachments.first().let {
            MessageAttachment()
                .setType(MessageAttachmentType.PHOTO)
                .setPhoto(Photo().also { photo ->
                    photo.accessKey = it.accessKey
                    photo.albumId = it.albumId
                    photo.comments = it.comments
                    photo.date = it.date
                    photo.hasTags = it.hasTags
                    photo.height = it.height
                    photo.id = it.id
                    photo.images = it.images
                    photo.lat = it.lat
                    photo.likes = it.likes
                    photo.lng = it.lng
                    photo.ownerId = it.ownerId
                    photo.photo256 = it.photo256
                    photo.place = it.place
                    photo.postId = it.postId
                    photo.realOffset = it.realOffset
                    photo.reposts = it.reposts
                    photo.sizes = it.sizes
                    photo.squareCrop = it.squareCrop
                    photo.tags = it.tags
                    photo.text = it.text
                    photo.thumbHash = it.thumbHash
                    photo.userId = it.userId
                    photo.verticalAlign = it.verticalAlign
                    photo.width = it.width
                })
        }
    }

    fun send(
        toId: Long,
        text: String,
        attachmentsUnsafe: List<MessageAttachment> = emptyList(),
        saveToHistory: Boolean = true
    ) {
        if (attachmentsUnsafe.size > MAX_ATTACHMENTS_PER_MESSAGE) {
            log.warn(
                "Too many attachments (${attachmentsUnsafe.size}) only first $MAX_ATTACHMENTS_PER_MESSAGE will be sent"
            )
        }
        val attachments = attachmentsUnsafe.take(MAX_ATTACHMENTS_PER_MESSAGE)
        if (text.isBlank() && attachments.isEmpty()) {
            log.error("Empty message without attachments cannot be sent")
            return
        }
        val attachmentString = attachments.joinToString(",") { attachmentToString(it) }
        var response = vkApiClient.messages()
            .sendDeprecated(vkGroupActor)
            .peerId(toId)
            .message(text)
            .attachment(attachmentString)
            .randomId((0..Int.MAX_VALUE).random())
            .execute()
            .toLong()
        if (response == 0L) {
            response = -vkMessageRepository.getMaxConversationMessageIdByPeerId(toId) - 1
        }
        if (saveToHistory) {
            vkMessageOrmService.save(VkMessageModel(
                conversationMessageId = response,
                fromId = -vkGroupId,
                peerId = toId,
                text = text,
                attachmentDtos = attachments,
                timestamp = Instant.now(),
                forwardedMessages = listOf()
            ))
        }
    }

    fun sendSticker(toId: Long, stickerId: Int) {
        vkApiClient.messages().sendDeprecated(vkGroupActor)
            .peerId(toId)
            .stickerId(stickerId)
            .randomId((0..Int.MAX_VALUE).random())
            .execute()
    }

    fun getChatMembers(peerId: Long): GetConversationMembersResponse {
        return vkApiClient.messages()
            .getConversationMembers(vkGroupActor)
            .peerId(peerId)
            .execute()
    }

    private fun attachmentToString(attachment: MessageAttachment): String {
        return when (attachment.type) {
            MessageAttachmentType.PHOTO -> {
                val p = attachment.photo!!
                "photo${p.ownerId}_${p.id}${if (p.accessKey != null) "_${p.accessKey}" else ""}"
            }
            MessageAttachmentType.AUDIO_MESSAGE -> {
                val a = attachment.audioMessage!!
                "audio_message${a.ownerId}_${a.id}"
            }
            else -> throw IllegalArgumentException("Unsupported attachment type: ${attachment.type}")
        }
    }

    private fun toModel(message: Message): VkMessageModel {
        val forwardedMessages = (listOf(message.replyMessage) + message.fwdMessages)
            .filterNotNull()
            .map { toModel(it) }
        return VkMessageModel(
            message.conversationMessageId.toLong(),
            message.peerId,
            message.fromId,
            message.date?.let { Instant.ofEpochSecond(it.toLong()) },
            message.text,
            forwardedMessages,
            message.attachments,
        )
    }

    private fun toModel(message: ForeignMessage): VkMessageModel {
        val forwardedMessages = (listOf(message.replyMessage) + (message.fwdMessages ?: listOf()))
            .filterNotNull()
            .map { toModel(it) }
        return VkMessageModel(
            message.conversationMessageId.toLong(),
            message.peerId,
            message.fromId,
            message.date?.let { Instant.ofEpochSecond(it.toLong()) },
            message.text,
            forwardedMessages,
            message.attachments,
        )
    }

    private class LongPollHandler(
        client: VkApiClient,
        actor: GroupActor,
        waitTime: Int,
        private val onNewMessage: (MessageNew) -> Unit
    ): GroupLongPollApi(client, actor, waitTime) {
        override fun messageNew(groupId: Int?, message: MessageNew?) {
            if (message == null) {
                log.error("Received null message")
            } else {
                onNewMessage(message)
            }
        }
    }
}