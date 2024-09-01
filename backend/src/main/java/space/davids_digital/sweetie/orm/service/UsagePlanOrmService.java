package space.davids_digital.sweetie.orm.service;

import org.springframework.stereotype.Service;
import space.davids_digital.sweetie.model.UsagePlanModel;
import space.davids_digital.sweetie.orm.entity.UsagePlanEntity;
import space.davids_digital.sweetie.orm.repository.UsagePlanRepository;

@Service
public class UsagePlanOrmService {
    private final UsagePlanRepository repository;

    public UsagePlanOrmService(UsagePlanRepository repository) {
        this.repository = repository;
    }

    public UsagePlanModel getById(String id) {
        return toModel(repository.findById(id).orElse(null));
    }

    public UsagePlanModel getOrDefault(String id, String defaultId) {
        if (id == null) {
            return getById(defaultId);
        }
        return toModel(repository.findById(id).orElseGet(() -> repository.findById(defaultId).orElse(null)));
    }

    private UsagePlanModel toModel(UsagePlanEntity dto) {
        if (dto == null) {
            return null;
        }
        return new UsagePlanModel(
                dto.id,
                dto.title,
                dto.maxCredits,
                dto.creditGainAmount,
                dto.creditGainPeriodSeconds,
                dto.visible
        );
    }

    private UsagePlanEntity toEntity(UsagePlanModel model) {
        if (model == null) {
            return null;
        }
        var entity = new UsagePlanEntity();
        entity.id = model.id();
        entity.title = model.title();
        entity.maxCredits = model.maxCredits();
        entity.creditGainAmount = model.creditGainAmount();
        entity.creditGainPeriodSeconds = model.creditGainPeriodSeconds();
        entity.visible = model.visible();
        return entity;
    }
}
