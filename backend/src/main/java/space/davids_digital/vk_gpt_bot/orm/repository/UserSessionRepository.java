package space.davids_digital.vk_gpt_bot.orm.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import space.davids_digital.vk_gpt_bot.orm.entity.UserSessionEntity;

import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends CrudRepository<UserSessionEntity, UUID> {
    Collection<UserSessionEntity> findAllByValidUntilBefore(ZonedDateTime validUntil);
    Collection<UserSessionEntity> findAllByUserVkIdAndValidUntilAfter(long userVkId, ZonedDateTime validUntil);
    void deleteByValidUntilBefore(ZonedDateTime validUntil);
}
