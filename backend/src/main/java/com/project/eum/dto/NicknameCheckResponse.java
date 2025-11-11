package com.project.eum.dto;

public record NicknameCheckResponse(boolean available, String message) {
    public static NicknameCheckResponse available(String nickname) {
        return new NicknameCheckResponse(true, nickname + " 닉네임을 사용할 수 있습니다.");
    }

    public static NicknameCheckResponse unavailable(String nickname) {
        return new NicknameCheckResponse(false, nickname + " 닉네임은 사용할 수 없습니다.");
    }
}
