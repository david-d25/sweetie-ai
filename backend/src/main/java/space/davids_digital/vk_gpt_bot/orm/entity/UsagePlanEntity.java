package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usage_plans")
public class UsagePlanEntity {
    @Id
    @Column(name = "id")
    public String id;

    @Column(name = "title")
    public String title;

    @Column(name = "max_credits")
    public long maxCredits;

    @Column(name = "credit_gain_amount")
    public long creditGainAmount;

    @Column(name = "credit_gain_period_seconds")
    public long creditGainPeriodSeconds;

    @Column(name = "visible")
    public boolean visible;
}
