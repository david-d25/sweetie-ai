package space.davids_digital.sweetie.rest

import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.context.request.WebRequest
import space.davids_digital.sweetie.rest.exception.InvalidSessionStateException
import space.davids_digital.sweetie.service.exception.ValidationException

@ControllerAdvice
class RestExceptionHandler {
    @ExceptionHandler(MissingServletRequestParameterException::class)
    fun handleMissingParameters(ex: MissingServletRequestParameterException): ResponseEntity<String> {
        return ResponseEntity
            .badRequest()
            .body("'${ex.parameterName}' parameter is missing")
    }

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(ex: ValidationException, request: WebRequest): ResponseEntity<String> {
        return ResponseEntity
            .badRequest()
            .body("Validation failed: ${ex.message}")
    }

    @ExceptionHandler(InvalidSessionStateException::class)
    fun handleInvalidSessionStateException(
        ex: ValidationException,
        request: WebRequest,
        response: HttpServletResponse
    ): ResponseEntity<String> {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .removeAuthCookies()
            .body("Invalid session state: ${ex.message}")
    }
}
