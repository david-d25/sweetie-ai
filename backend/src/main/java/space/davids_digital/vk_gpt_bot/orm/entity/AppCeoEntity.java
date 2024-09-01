package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_ceos")
public class AppCeoEntity {
    @Id
    @Column(name = "user_id")
    public long userId;
}
