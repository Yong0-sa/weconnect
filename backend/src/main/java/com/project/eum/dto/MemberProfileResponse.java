package com.project.eum.dto;

import com.project.eum.user.Member;

import java.time.LocalDateTime;

/**
 * 회원 프로필 정보를 반환하는 DTO(record).
 * - 기본 회원 정보 + 농장 여부 + 코인 + 생성/수정일 포함
 */
public record MemberProfileResponse(
        Long userId,
        String email,
        String nickname,
        String name,
        String phone,
        String role,
        Long farmId,
        boolean farmPromptShown,
        Long coinBalance,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    // Member 엔티티 → MemberProfileResponse 변환
    public static MemberProfileResponse from(Member member) {
        return new MemberProfileResponse(
                member.getUserId(),
                member.getEmail(),
                member.getNickname(),
                member.getName(),
                member.getPhone(),
                member.getRole() != null ? member.getRole().name() : null,
                member.getFarm() != null ? member.getFarm().getFarmId() : null,
                member.isFarmPromptShown(),
                member.getCoinBalance(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }
}
