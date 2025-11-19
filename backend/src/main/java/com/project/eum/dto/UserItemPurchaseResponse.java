package com.project.eum.dto;

/**
 * 아이템 구매 이후 응답 (코인 잔액 포함).
 */
public record UserItemPurchaseResponse(
        long coinBalance,
        UserItemSummaryResponse item
) {
}
