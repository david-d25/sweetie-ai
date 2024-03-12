package space.davids_digital.vk_gpt_bot.service.exception;

public class ValidationException extends RuntimeException {
    private final String message;

    public ValidationException(String message) {
        super(message);
        this.message = message;
    }

    @Override
    public String getMessage() {
        return message;
    }
}