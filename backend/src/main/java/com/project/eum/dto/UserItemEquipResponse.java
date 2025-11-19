package com.project.eum.dto;

import com.project.eum.shop.UserItemStatus;

/**
 * 장착 상태 변경 응답.
 */
public record UserItemEquipResponse(
        Long itemId,
        String category,
        UserItemStatus status
) {
}
