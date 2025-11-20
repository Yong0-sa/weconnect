package com.project.eum.dto;

/**
 * 아이템 장착 해제 요청 DTO.
 */
public record UserItemUnequipRequest(Long itemId, String category) {
}
