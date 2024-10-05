package space.davids_digital.sweetie.orm.repository.projection

import java.sql.Timestamp

interface MessageCountProjection {
    val time: Timestamp
    val count: Long
}
