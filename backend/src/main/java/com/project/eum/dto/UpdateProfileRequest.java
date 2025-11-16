package com.project.eum.dto;

/**
 * 회원 프로필 수정 요청 DTO.
 * - 기본 정보 수정 + 비밀번호 변경(옵션)
 * - currentPassword/newPassword는 비밀번호 변경 시에만 사용
 */
public record UpdateProfileRequest(
        String email,
        String nickname,
        String name,
        String phone,
        String currentPassword,
        String newPassword
) {
}
