package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*
import java.time.ZonedDateTime

@Entity
@Table(
    name = "vk_users",
    indexes = [
        Index(
            name = "vk_users__credits_index",
            columnList = "credits"
        )
    ]
)
class VkUserEntity {
    @Id
    @Column(name = "id")
    var id: Long = 0

    @Column(name = "first_name", columnDefinition = "text")
    var firstName: String = ""

    @Column(name = "last_name", columnDefinition = "text")
    var lastName: String = ""

    @Column(name = "credits")
    var credits: Long = 0

    @Column(name = "last_credit_gain")
    var lastCreditGain: ZonedDateTime? = null

    @Column(name = "usage_plan_id", columnDefinition = "text")
    var usagePlanId: String? = null

    @Column(name = "usage_plan_expiry")
    var usagePlanExpiry: ZonedDateTime? = null
}
