package space.davids_digital.vk_gpt_bot.orm.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import space.davids_digital.vk_gpt_bot.orm.entity.UserEntity;

@Repository
public interface UserRepository extends CrudRepository<UserEntity, Long> {}
