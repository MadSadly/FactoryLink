package com.factorylink.auth;

/**
 * {@code PUT /api/auth/profile} 본문. 이메일·새 비밀번호는 선택이며, 변경 시 {@code currentPassword}는 필수입니다.
 */
public record UpdateProfileRequest(String currentPassword, String email, String newPassword) {}
