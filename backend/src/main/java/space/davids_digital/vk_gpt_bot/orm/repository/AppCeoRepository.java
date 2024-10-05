package space.davids_digital.vk_gpt_bot.orm.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import space.davids_digital.vk_gpt_bot.orm.entity.AppCeoEntity;

@Repository
public interface AppCeoRepository extends CrudRepository<AppCeoEntity, Long> {
    boolean existsByUserId(long userId);
}
