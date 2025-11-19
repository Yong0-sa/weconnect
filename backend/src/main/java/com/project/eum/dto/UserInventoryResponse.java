package com.project.eum.dto;

import java.util.List;

/**
 * 사용자 보유 아이템 전체 응답.
 */
public record UserInventoryResponse(List<UserItemSummaryResponse> items) {
}
