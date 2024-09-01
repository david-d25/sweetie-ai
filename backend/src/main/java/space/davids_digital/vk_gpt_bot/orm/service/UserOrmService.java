package space.davids_digital.vk_gpt_bot.orm.service;

import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.model.UserModel;
import space.davids_digital.vk_gpt_bot.orm.entity.UserEntity;
import space.davids_digital.vk_gpt_bot.orm.repository.AppCeoRepository;
import space.davids_digital.vk_gpt_bot.orm.repository.UserRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
public class UserOrmService {
    private final UserRepository userRepository;
    private final AppCeoRepository appCeoRepository;

    public UserOrmService(UserRepository userRepository, AppCeoRepository appCeoRepository) {
        this.userRepository = userRepository;
        this.appCeoRepository = appCeoRepository;
    }

    public UserModel save(UserModel user) {
        return toModel(userRepository.save(toEntity(user)));
    }

    public UserModel getOrCreateDefault(long id) {
        var user = getById(id);
        if (user == null) {
            user = save(
                    new UserModel(
                            id,
                            "",
                            "",
                            0,
                            ZonedDateTime.from(Instant.EPOCH.atZone(ZoneId.systemDefault())),
                            "default",
                            null
                    )
            );
        }
        return user;
    }

    public UserModel getById(long id) {
        var userEntity = userRepository.findById(id).orElse(null);
        if (userEntity == null)
            return null;
        return toModel(userEntity);
    }

    public boolean isUserCeo(long id) {
        return appCeoRepository.existsById(id);
    }

    private UserModel toModel(UserEntity entity) {
        return new UserModel(
                entity.id,
                entity.firstName,
                entity.lastName,
                entity.credits,
                entity.lastCreditGain,
                entity.usagePlanId,
                entity.usagePlanExpiry
        );
    }

    private UserEntity toEntity(UserModel model) {
        var entity = new UserEntity();
        entity.id = model.vkId();
        entity.firstName = model.firstNameCached();
        entity.lastName = model.firstNameCached();
        entity.credits = model.credits();
        entity.lastCreditGain = model.lastCreditGain();
        entity.usagePlanId = model.usagePlanId();
        entity.usagePlanExpiry = model.usagePlanExpiry();
        return entity;
    }
}
