package com.project.eum.dto;

/**
 * 코인 차감(구매) 요청 DTO.
 */
public record CoinPurchaseRequest(Long price, String itemName) {
}
