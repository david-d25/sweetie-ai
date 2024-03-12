package space.davids_digital.vk_gpt_bot.orm.repository.projection;

import java.sql.Timestamp;

public interface MessageCountProjection {
    Timestamp getTime();
    long getCount();
}
