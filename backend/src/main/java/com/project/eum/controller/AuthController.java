package com.project.eum.controller;

import com.project.eum.dto.LoginRequest;
import com.project.eum.dto.LoginResponse;
import com.project.eum.dto.SignUpRequest;
import com.project.eum.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final String defaultEmail;
    private final String defaultPassword;
    private final MemberService memberService;

    public AuthController(
            MemberService memberService,
            @Value("${app.auth.default-email:test@gmail.com}") String defaultEmail,
            @Value("${app.auth.default-password:test1234}") String defaultPassword
    ) {
        this.memberService = memberService;
        this.defaultEmail = defaultEmail;
        this.defaultPassword = defaultPassword;
    }

    // 로그인
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

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@Valid @RequestBody SignUpRequest req) {
        Long id = memberService.signUp(req);
        return ResponseEntity
                .status(201)
                .body(new SignUpResponse(id, "회원가입이 완료되었습니다."));
    }

    // 응답용 내부 클래스
    record SignUpResponse(Long id, String message) {}    

}
