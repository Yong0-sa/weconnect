package com.project.eum.dto;

/**
 * 코인 적립 요청 DTO.
 */
public record CoinAddRequest(Long amount, String reason) {
}
