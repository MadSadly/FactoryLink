package com.factorylink.auth;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class JwtUserPrincipal implements UserDetails {

  private final Long userId;
  private final Long companyId;
  private final String email;
  private final String role;

  public JwtUserPrincipal(Long userId, Long companyId, String email, String role) {
    this.userId = userId;
    this.companyId = companyId;
    this.email = email;
    this.role = role;
  }

  public Long getUserId() {
    return userId;
  }

  public Long getCompanyId() {
    return companyId;
  }

  public String getRole() {
    return role;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_" + role));
  }

  @Override
  public String getPassword() {
    return null;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
