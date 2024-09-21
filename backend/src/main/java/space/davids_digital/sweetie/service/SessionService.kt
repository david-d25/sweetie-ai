package space.davids_digital.sweetie.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import space.davids_digital.sweetie.model.UserSessionModel;
import space.davids_digital.sweetie.rest.auth.UserAuthentication;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class SessionService {
    private static final int TOKEN_LENGTH_BYTES = 64;

    public String createNewSessionToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[TOKEN_LENGTH_BYTES];
        random.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    public UserSessionModel requireSession() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof UserAuthentication) {
            return ((UserAuthentication) authentication).getSession();
        }
        throw new SecurityException("Session was required, but is not present");
    }
}
