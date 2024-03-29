package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.ZonedDateTime;

@Entity
@Table(name = "vk_users")
public class UserEntity {
    @Id
    @Column(name = "id")
    public long id;

    @Column(name = "first_name")
    public String firstName;

    @Column(name = "last_name")
    public String lastName;

    @Column(name = "credits")
    public long credits;

    @Column(name = "last_credit_gain")
    public ZonedDateTime lastCreditGain;

    @Column(name = "usage_plan_id")
    public String usagePlanId;

    @Column(name = "usage_plan_expiry")
    public ZonedDateTime usagePlanExpiry;
}
