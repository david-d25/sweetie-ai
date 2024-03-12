package space.davids_digital.vk_gpt_bot.rest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import space.davids_digital.vk_gpt_bot.service.exception.ValidationException;

@ControllerAdvice
public class RestExceptionHandler {
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<String> handleMissingParameters(MissingServletRequestParameterException ex) {
        String name = ex.getParameterName();
        return ResponseEntity
                .badRequest()
                .body(String.format("'%s' parameter is missing", name));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<String> handleValidationException(ValidationException ex, WebRequest request) {
        return ResponseEntity
                .badRequest()
                .body(String.format("Validation failed: " + ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleInvalidSessionStateException(ValidationException ex, WebRequest request) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(String.format("Invalid session state: " + ex.getMessage()));
    }
}
