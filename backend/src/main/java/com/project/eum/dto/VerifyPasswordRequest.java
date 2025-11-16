package com.project.eum.dto;

/**
 * 현재 비밀번호 확인 요청 DTO.
 * - 프로필 수정/중요 작업 전 비밀번호 검증 시 사용
 */
public record VerifyPasswordRequest(
        String password
) {
}
