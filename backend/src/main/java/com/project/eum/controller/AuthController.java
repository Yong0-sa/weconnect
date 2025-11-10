package com.project.eum.controller;

import com.project.eum.dto.LoginRequest;
import com.project.eum.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/auth", "/auth"})
public class AuthController {

    private final String defaultEmail;
    private final String defaultPassword;

    public AuthController(
            @Value("${app.auth.default-email:test@gmail.com}") String defaultEmail,
            @Value("${app.auth.default-password:test1234}") String defaultPassword
    ) {
        this.defaultEmail = defaultEmail;
        this.defaultPassword = defaultPassword;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword();

        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            return ResponseEntity.badRequest()
                    .body(LoginResponse.failure("이메일과 비밀번호를 모두 입력해 주세요."));
        }

        if (email.equalsIgnoreCase(defaultEmail) && password.equals(defaultPassword)) {
            String token = UUID.randomUUID().toString();
            return ResponseEntity.ok(LoginResponse.success("로그인에 성공했습니다.", token));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse.failure("로그인 정보가 일치하지 않습니다."));
    }
}
