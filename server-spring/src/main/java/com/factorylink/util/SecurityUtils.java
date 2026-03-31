package com.factorylink.util;

import com.factorylink.auth.JwtUserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

public final class SecurityUtils {

  private SecurityUtils() {}

  public static JwtUserPrincipal requirePrincipal() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof JwtUserPrincipal principal)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
    }
    return principal;
  }

  /** JWT가 없거나 익명이면 null. */
  public static Long optionalCompanyId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof JwtUserPrincipal principal)) {
      return null;
    }
    return principal.getCompanyId();
  }

  public static void requireCompany(JwtUserPrincipal principal, Long companyId) {
    if (companyId == null
        || principal.getCompanyId() == null
        || !principal.getCompanyId().equals(companyId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
    }
  }
}
