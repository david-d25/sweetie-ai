package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.ChatSettingsEntity

@Repository
interface ChatSettingsRepository : CrudRepository<ChatSettingsEntity, Long> {
    @Query("select settings from ChatAdminEntity admin left join ChatSettingsEntity settings on (admin.peerId = settings.peerId or :adminId in (select appCeo.userId from AppCeoEntity appCeo)) where admin.userId = :adminId")
    fun findHavingAdmin(@Param("adminId") adminId: Long): Collection<ChatSettingsEntity>

    @Query("select settings from ChatAdminEntity admin left join ChatSettingsEntity settings on (admin.peerId = settings.peerId or :adminId in (select appCeo.userId from AppCeoEntity appCeo)) where settings.peerId = :peerId and admin.userId = :adminId")
    fun findByIdAndHavingAdmin(@Param("peerId") peerId: Long, @Param("adminId") adminId: Long): ChatSettingsEntity?
}
