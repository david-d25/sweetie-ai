package space.davids_digital.sweetie.rest.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.GenericFilterBean;
import space.davids_digital.sweetie.model.UserSessionModel;
import space.davids_digital.sweetie.orm.service.UserSessionOrmService;
import space.davids_digital.sweetie.rest.CookieName;

import java.io.IOException;

public class AuthenticationFilter extends GenericFilterBean {
    private final UserSessionOrmService userSessionOrmService;

    public AuthenticationFilter(UserSessionOrmService userSessionOrmService) {
        this.userSessionOrmService = userSessionOrmService;
    }

    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain filterChain
    ) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        Long userVkId = parseLongOrNull(getCookie(httpRequest, CookieName.USER_VK_ID));
        String sessionToken = getCookie(httpRequest, CookieName.AUTH_TOKEN);
        if (userVkId != null && sessionToken != null) {
            UserSessionModel session = getValidatedSession(userVkId, sessionToken);
            if (session != null) {
                SecurityContextHolder.getContext().setAuthentication(new UserAuthentication(session));
            }
        }
        filterChain.doFilter(request, response);
    }

    public Long parseLongOrNull(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getCookie(HttpServletRequest request, String name) {
        var cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (var cookie : cookies) {
            if (cookie.getName().equals(name)) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private UserSessionModel getValidatedSession(long userVkId, String sessionToken) {
        var sessions = userSessionOrmService.getUnexpiredUserSessionsByVkId(userVkId);
        return sessions.stream().filter(s -> s.sessionToken().equals(sessionToken)).findFirst().orElse(null);
    }
}
