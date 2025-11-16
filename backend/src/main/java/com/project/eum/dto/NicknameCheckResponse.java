package com.project.eum.dto;

/**
 * 닉네임 중복 검사 결과를 전달하는 응답 DTO.
 * - available: 사용 가능 여부
 * - message: 안내 문구
 */
public record NicknameCheckResponse(boolean available, String message) {
    // 닉네임 사용 가능 응답 생성
    public static NicknameCheckResponse available(String nickname) {
        return new NicknameCheckResponse(true, nickname + " 닉네임을 사용할 수 있습니다.");
    }

    // 닉네임 사용 불가 응답 생성
    public static NicknameCheckResponse unavailable(String nickname) {
        return new NicknameCheckResponse(false, nickname + " 닉네임은 사용할 수 없습니다.");
    }
}
