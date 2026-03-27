package com.factorylink.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

  private final SecretKey signingKey;
  private final long expirationMs;

  public JwtTokenProvider(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms}") long expirationMs) {
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
  }

  public String createToken(Long userId, String email, String role) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(email)
        .claim("userId", userId)
        .claim("role", role)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusMillis(expirationMs)))
        .signWith(signingKey)
        .compact();
  }

  public boolean isValid(String token) {
    try {
      Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  public void setAuthentication(String token) {
    Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    String role = String.valueOf(claims.get("role"));

    UsernamePasswordAuthenticationToken auth =
        new UsernamePasswordAuthenticationToken(
            claims.getSubject(),
            null,
            java.util.List.of(new SimpleGrantedAuthority("ROLE_" + role)));

    SecurityContextHolder.getContext().setAuthentication(auth);
  }
}
