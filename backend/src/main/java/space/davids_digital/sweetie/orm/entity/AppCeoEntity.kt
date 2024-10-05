package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "app_ceos")
class AppCeoEntity {
    @Id
    @Column(name = "user_id")
    var userId: Long = 0
}