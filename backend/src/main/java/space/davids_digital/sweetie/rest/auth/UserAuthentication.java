package space.davids_digital.sweetie.rest.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import space.davids_digital.sweetie.model.UserSessionModel;

import java.util.Collection;

public class UserAuthentication implements Authentication {
    private final UserSessionModel session;
    private boolean authenticated = true;

    public UserAuthentication(UserSessionModel session) {
        this.session = session;
    }

    public UserSessionModel getSession() {
        return session;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return null;
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getDetails() {
        return null;
    }

    @Override
    public Long getPrincipal() {
        return session.userVkId();
    }

    @Override
    public boolean isAuthenticated() {
        return authenticated;
    }

    @Override
    public void setAuthenticated(boolean isAuthenticated) throws IllegalArgumentException {
        this.authenticated = isAuthenticated;
    }

    @Override
    public String getName() {
        return null;
    }
}
