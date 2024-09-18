package space.davids_digital.sweetie.orm.repository

import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.UsagePlanEntity

@Repository
interface UsagePlanRepository : CrudRepository<UsagePlanEntity, String>