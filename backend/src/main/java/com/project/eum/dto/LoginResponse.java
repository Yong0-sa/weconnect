package com.project.eum.dto;

public class LoginResponse {

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

    public static LoginResponse success(String message, String token, Long userId, String nickname, String role) {
        return new LoginResponse(true, message, token, userId, nickname, role);
    }

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
