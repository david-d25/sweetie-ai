package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "usage_plans")
class UsagePlanEntity {
    @Id
    @Column(name = "id", columnDefinition = "text")
    var id: String = ""

    @Column(name = "title", columnDefinition = "text")
    var title: String = ""

    @Column(name = "max_credits")
    var maxCredits: Long = 0

    @Column(name = "credit_gain_amount")
    var creditGainAmount: Long = 0

    @Column(name = "credit_gain_period_seconds")
    var creditGainPeriodSeconds: Long = 0

    @Column(name = "visible")
    var visible = false
}
