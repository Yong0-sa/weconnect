package com.project.eum.controller;

import com.project.eum.dto.LoginRequest;
import com.project.eum.dto.LoginResponse;
import com.project.eum.dto.SignUpRequest;
import com.project.eum.service.MemberService;
import com.project.eum.user.Member;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@Slf4j
@RequestMapping({"/api/auth", "/auth"})
public class AuthController {

    // 세션에 로그인 상태를 저장할 때 사용하는 키 값
    private static final String SESSION_MEMBER_ID = "LOGIN_MEMBER_ID";
    private static final String SESSION_MEMBER_ROLE = "LOGIN_MEMBER_ROLE";

    // 인증 관련 비즈니스 로직을 위임받는 서비스
    private final MemberService memberService;

    public AuthController(MemberService memberService) {
        this.memberService = memberService;
    }

    // 기본 계정과 일치하면 임시 토큰을 내려주는 단순 로그인 엔드포인트
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request, HttpSession session) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword();

        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            return ResponseEntity.badRequest()
                    .body(LoginResponse.failure("이메일과 비밀번호를 모두 입력해 주세요."));
        }

        Member member;
        try {
            member = memberService.authenticate(email, password);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(LoginResponse.failure(ex.getMessage()));
        }

        session.setAttribute(SESSION_MEMBER_ID, member.getUserId());
        session.setAttribute(SESSION_MEMBER_ROLE, member.getRole());
        // log.info("session id={}", session.getId());

        String token = UUID.randomUUID().toString();
        return ResponseEntity.ok(
                LoginResponse.success(
                        "로그인에 성공했습니다.",
                        token,
                        member.getUserId(),
                        member.getNickname(),
                        member.getRole().name()
                )
        );
    }

    // 실제 가입 처리는 MemberService 로 위임한다
    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@Valid @RequestBody SignUpRequest req) {
        Long id = memberService.signUp(req);
        return ResponseEntity
                .status(201)
                .body(new SignUpResponse(id, "회원가입이 완료되었습니다."));
    }

    // 프론트가 확인하기 쉬운 형태의 간단한 응답 바디
    record SignUpResponse(Long id, String message) {}    

}
