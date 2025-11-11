package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.MemberProfileResponse;
import com.project.eum.dto.NicknameCheckRequest;
import com.project.eum.dto.NicknameCheckResponse;
import com.project.eum.dto.UpdateProfileRequest;
import com.project.eum.service.MemberService;
import com.project.eum.user.Member;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/profile", "/profile"})
@RequiredArgsConstructor
public class ProfileController {

    private final MemberService memberService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
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
}
