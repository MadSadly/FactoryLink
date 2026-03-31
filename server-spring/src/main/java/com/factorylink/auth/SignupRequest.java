package com.factorylink.auth;

/**
 * 회원가입 요청 본문. {@code businessNumber}는 모의 인증을 통과한 값과 동일해야 하며 가입 시 해당 회사 행에 저장됩니다.
 */
public record SignupRequest(
    String email,
    String password,
    String name,
    String role,
    Long companyId,
    String businessNumber) {}
