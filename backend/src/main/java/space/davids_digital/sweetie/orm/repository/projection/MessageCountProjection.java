package space.davids_digital.sweetie.orm.repository.projection;

import java.sql.Timestamp;

public interface MessageCountProjection {
    Timestamp getTime();
    long getCount();
}
