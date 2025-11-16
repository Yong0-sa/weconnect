package com.project.eum.dto;

/**
 * 닉네임 중복 확인 요청 DTO.
 * - 클라이언트가 전달한 닉네임 한 개만 포함
 */
public record NicknameCheckRequest(String nickname) {
}
