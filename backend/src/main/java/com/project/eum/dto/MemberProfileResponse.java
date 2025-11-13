package com.project.eum.dto;

import com.project.eum.user.Member;

import java.time.LocalDateTime;

public record MemberProfileResponse(
        Long userId,
        String email,
        String nickname,
        String name,
        String phone,
        String role,
        Long farmId,
        Long coinBalance,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MemberProfileResponse from(Member member) {
        return new MemberProfileResponse(
                member.getUserId(),
                member.getEmail(),
                member.getNickname(),
                member.getName(),
                member.getPhone(),
                member.getRole() != null ? member.getRole().name() : null,
                member.getFarm() != null ? member.getFarm().getFarmId() : null,
                member.getCoinBalance(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }
}
