package space.davids_digital.sweetie.orm.repository

import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.AppCeoEntity

@Repository
interface AppCeoRepository: CrudRepository<AppCeoEntity, Long> {
    fun existsByUserId(userId: Long): Boolean
}