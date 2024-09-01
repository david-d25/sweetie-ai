package space.davids_digital.vk_gpt_bot.orm.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import space.davids_digital.vk_gpt_bot.orm.entity.ChatSettingsEntity;

import java.util.Collection;

@Repository
public interface ChatSettingsRepository extends CrudRepository<ChatSettingsEntity, Long> {
    @Query("select settings from ChatAdminEntity admin left join ChatSettingsEntity settings on (admin.peerId = settings.peerId or :adminId in (select appCeo.userId from AppCeoEntity appCeo)) where admin.userId = :adminId")
    Collection<ChatSettingsEntity> findHavingAdmin(@Param("adminId") long adminId);

    @Query("select settings from ChatAdminEntity admin left join ChatSettingsEntity settings on (admin.peerId = settings.peerId or :adminId in (select appCeo.userId from AppCeoEntity appCeo)) where settings.peerId = :peerId and admin.userId = :adminId")
    ChatSettingsEntity findByIdAndHavingAdmin(@Param("peerId") long peerId, @Param("adminId") long adminId);
}
