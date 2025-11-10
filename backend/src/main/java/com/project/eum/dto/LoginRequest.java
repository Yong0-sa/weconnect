package com.project.eum.dto;

public class LoginRequest {

    // 로그인 폼이 전달하는 가장 기본적인 데이터
    private String email;
    private String password;

    // 직렬화/역직렬화를 위해 기본 생성자를 둔다
    public LoginRequest() {
    }

    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
