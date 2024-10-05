package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.orm.entity.ChatAdminEntity
import space.davids_digital.sweetie.orm.repository.ChatAdminRepository

@Service
class ChatAdminOrmService(
    private val chatAdminRepository: ChatAdminRepository
) {
    fun getAdminUserIds(peerId: Long): List<Long> {
        return chatAdminRepository.findAllByPeerId(peerId).map { it.userId }
    }

    fun addAdmin(peerId: Long, userId: Long) {
        val chatAdmin = ChatAdminEntity()
        chatAdmin.peerId = peerId
        chatAdmin.userId = userId
        chatAdminRepository.save(chatAdmin)
    }

    fun removeAdmin(peerId: Long, userId: Long) {
        chatAdminRepository.deleteByPeerIdAndUserId(peerId, userId)
    }
}