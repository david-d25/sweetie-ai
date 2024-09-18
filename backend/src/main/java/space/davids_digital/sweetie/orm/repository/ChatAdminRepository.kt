package space.davids_digital.sweetie.orm.repository

import org.springframework.data.repository.CrudRepository
import space.davids_digital.sweetie.orm.entity.ChatAdminEntity
import space.davids_digital.sweetie.orm.entity.ChatAdminEntityId

interface ChatAdminRepository: CrudRepository<ChatAdminEntity, ChatAdminEntityId> {
    fun existsByUserIdAndPeerId(userId: Long, peerId: Long): Boolean
    fun findAllByPeerId(peerId: Long): List<ChatAdminEntity>
    fun deleteByPeerIdAndUserId(peerId: Long, userId: Long)
}