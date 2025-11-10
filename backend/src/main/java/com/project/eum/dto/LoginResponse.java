package com.project.eum.dto;

public class LoginResponse {

    // 로그인 요청 결과와 메시지, 임시 토큰을 담는다
    private boolean success;
    private String message;
    private String token;
    private Long userId;
    private String nickname;
    private String role;

    public LoginResponse() {
    }

    public LoginResponse(
            boolean success,
            String message,
            String token,
            Long userId,
            String nickname,
            String role
    ) {
        this.success = success;
        this.message = message;
        this.token = token;
        this.userId = userId;
        this.nickname = nickname;
        this.role = role;
    }

    // 헬퍼를 통해 응답 생성 코드를 단순화한다
    public static LoginResponse success(String message, String token, Long userId, String nickname, String role) {
        return new LoginResponse(true, message, token, userId, nickname, role);
    }

    // 실패 시에는 민감한 정보를 포함하지 않는다
    public static LoginResponse failure(String message) {
        return new LoginResponse(false, message, null, null, null, null);
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
