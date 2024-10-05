package space.davids_digital.sweetie.rest.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.FORBIDDEN)
class InvalidSessionStateException : RuntimeException {
    constructor(message: String?) : super(message)
    constructor() : super()
}
