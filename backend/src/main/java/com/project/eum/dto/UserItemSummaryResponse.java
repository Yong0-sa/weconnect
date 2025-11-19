package com.project.eum.dto;

import com.project.eum.shop.UserItemStatus;

import java.time.Instant;

/**
 * 사용자 보유 아이템 요약 정보.
 */
public record UserItemSummaryResponse(
        Long userItemId,
        Long itemId,
        String category,
        UserItemStatus status,
        Instant acquiredAt
) {
}
