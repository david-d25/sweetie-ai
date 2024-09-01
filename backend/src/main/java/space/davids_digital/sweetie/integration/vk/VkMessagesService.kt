package space.davids_digital.sweetie.integration.vk

import com.vk.api.sdk.client.VkApiClient
import com.vk.api.sdk.client.actors.GroupActor
import com.vk.api.sdk.events.longpoll.GroupLongPollApi
import com.vk.api.sdk.objects.callback.MessageNew
import io.reactivex.rxjava3.subjects.PublishSubject
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class VkMessagesService @Autowired constructor(
    private val vkApiClient: VkApiClient,
    private val vkGroupActor: GroupActor
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkMessagesService::class.java)
    }

    private val messageStream = PublishSubject.create<MessageNew>()

    @PostConstruct
    private fun initLongPolling() {
        log.info("Init long polling")
        vkApiClient.groups().setLongPollSettings(vkGroupActor).enabled(true).messageEvent(true).execute();
        val handler = LongPollHandler(vkApiClient, vkGroupActor, 25) {
            messageStream.onNext(it)
        }
        handler.run()
    }

    fun getMessageStream() = messageStream



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