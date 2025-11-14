package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.MemberProfileResponse;
import com.project.eum.dto.NicknameCheckRequest;
import com.project.eum.dto.NicknameCheckResponse;
import com.project.eum.dto.UpdateProfileRequest;
import com.project.eum.dto.VerifyPasswordRequest;
import com.project.eum.service.MemberService;
import com.project.eum.user.Member;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController  // REST API 응답(JSON)을 반환
@RequestMapping({"/api/profile", "/profile"}) 
@RequiredArgsConstructor  // 생성자 주입 자동 생성
public class ProfileController {
    // 회원 관련 비즈니스 로직 담당 서비스
    private final MemberService memberService;

    // 로그인된 사용자 정보 조회
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) { // 로그인하지 않은 경우
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        try {
            Member member = memberService.getMember(memberId);
            return ResponseEntity.ok(MemberProfileResponse.from(member));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
    }

    // 닉네임 중복 검사
    @PostMapping("/check-nickname")
    public ResponseEntity<?> checkNickname(@RequestBody NicknameCheckRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        if (request == null || request.nickname() == null || request.nickname().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("닉네임을 입력해 주세요.");
        }

        boolean available = memberService.isNicknameAvailable(memberId, request.nickname());
        NicknameCheckResponse response = available
                ? NicknameCheckResponse.available(request.nickname().trim())
                : NicknameCheckResponse.unavailable(request.nickname().trim());
        return ResponseEntity.ok(response);
    }

    // 프로필 수정 (닉네임, 전화번호 등)
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        try {
            Member updated = memberService.updateProfile(memberId, request);
            return ResponseEntity.ok(MemberProfileResponse.from(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    // 현재 비밀번호가 일치하는지 검증
    @PostMapping("/verify-password")
    public ResponseEntity<?> verifyPassword(@RequestBody VerifyPasswordRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        if (request == null || request.password() == null || request.password().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("비밀번호를 입력해 주세요.");
        }

        try {
            memberService.verifyCurrentPassword(memberId, request.password());
            return ResponseEntity.ok(Map.of("verified", true));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    // 회원 탈퇴 (DB 삭제 + 세션 만료)
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        try {
            memberService.deleteMember(memberId);
            session.invalidate();  // 세션 만료 (로그아웃 효과)
            return ResponseEntity.ok(Map.of("deleted", true));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    @PostMapping("/farm-prompt/shown")
    public ResponseEntity<?> acknowledgeFarmPrompt(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        memberService.markFarmPromptShown(memberId);
        return ResponseEntity.ok(Map.of("acknowledged", true));
    }
}
