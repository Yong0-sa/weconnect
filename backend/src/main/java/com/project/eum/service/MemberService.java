package com.project.eum.service;

import com.project.eum.dto.SignUpRequest;
import com.project.eum.dto.UpdateProfileRequest;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.MemberType;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;

/**
 * 회원 가입, 로그인, 프로필 수정 등
 * 회원 관련 핵심 비즈니스 로직을 담당하는 서비스.
 */
@Service
@RequiredArgsConstructor
public class MemberService {

    // 회원 가입과 관련된 주요 비즈니스 로직을 담당한다.
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원가입 처리.
     * - 이메일/닉네임 중복 검사
     * - 비밀번호 암호화
     * - Member 엔티티 생성 및 저장
     */
    @Transactional
    public Long signUp(SignUpRequest req) {
        String sanitizedEmail = sanitizeEmail(req.getEmail());

        // 기본 중복 검사를 통과하지 못하면 즉시 예외를 던진다
        if (memberRepository.existsByEmail(sanitizedEmail)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        if (memberRepository.existsByNickname(req.getNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        // 요청 값을 정제한 뒤 영속화할 회원 엔티티를 조립한다
        Member member = Member.builder()
                .email(sanitizedEmail)
                .nickname(req.getNickname().trim())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .name(req.getName().trim())
                .phone(req.getPhone().trim())
                .role(resolveRole(req.getMemberType()))
                .build();

        memberRepository.save(member);
        return member.getUserId();
    }

    /**
     * 로그인 이메일/비밀번호 검증.
     * - 이메일 존재 여부
     * - 비밀번호 일치 여부
     */
    @Transactional(readOnly = true)
    public Member authenticate(String email, String rawPassword) {
        // 1) 빈값 체크
        if (!StringUtils.hasText(email) || !StringUtils.hasText(rawPassword)) {
            throw new IllegalArgumentException("이메일과 비밀번호를 모두 입력해 주세요.");
        }

        // 2) 이메일 정규화 후 DB 조회
        String sanitizedEmail = email.trim().toLowerCase();

        Member member = memberRepository.findByEmail(sanitizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("로그인 정보가 일치하지 않습니다."));

        // 3) 비밀번호 검증
        if (!passwordEncoder.matches(rawPassword, member.getPasswordHash())) {
            throw new IllegalArgumentException("로그인 정보가 일치하지 않습니다.");
        }

        return member;
    }


    /* ============================================================
       이메일 포맷 정리
       ============================================================ */
    private String sanitizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /* ============================================================
       회원 단건 조회
       ============================================================ */
    @Transactional(readOnly = true)
    public Member getMember(Long memberId) {
        if (memberId == null) {
            throw new IllegalArgumentException("유효하지 않은 회원 번호입니다.");
        }
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
    }


    /* ============================================================
       닉네임 중복 체크 (현재 본인 제외)
       ============================================================ */
    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(Long memberId, String nickname) {
        // 1) 입력 필수
        if (!StringUtils.hasText(nickname)) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }
        String sanitized = nickname.trim();
        Member member = getMember(memberId);

        // 2) 현재 닉네임이면 사용 가능
        if (sanitized.equals(member.getNickname())) {
            return true;
        }

        // 3) 다른 사용자 중복 여부 체크
        return !memberRepository.existsByNicknameAndUserIdNot(sanitized, memberId);
    }

    /**
     * 프로필 수정.
     * - 이메일/닉네임 중복 검사
     * - 비밀번호 변경 시 현재 비밀번호 확인
     * - Member 필드 업데이트
     */
    @Transactional
    public Member updateProfile(Long memberId, UpdateProfileRequest request) {
        Member member = getMember(memberId);

        // 이메일 변경 처리
        String nextEmail = member.getEmail();
        if (StringUtils.hasText(request.email())) {
            String sanitizedEmail = request.email().trim().toLowerCase();
            if (!sanitizedEmail.equals(member.getEmail()) &&
                    memberRepository.existsByEmailAndUserIdNot(sanitizedEmail, memberId)) {
                throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
            }
            nextEmail = sanitizedEmail;
        }

        // 닉네임 변경 처리
        String nextNickname = member.getNickname();
        if (StringUtils.hasText(request.nickname())) {
            String sanitizedNickname = request.nickname().trim();
            if (!sanitizedNickname.equals(member.getNickname()) &&
                    memberRepository.existsByNicknameAndUserIdNot(sanitizedNickname, memberId)) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
            nextNickname = sanitizedNickname;
        }

        // 기본 정보 변경
        String nextName = member.getName();
        if (StringUtils.hasText(request.name())) {
            nextName = request.name().trim();
        }

        String nextPhone = member.getPhone();
        if (StringUtils.hasText(request.phone())) {
            nextPhone = request.phone().trim();
        }

        // 비밀번호 변경 처리
        if (StringUtils.hasText(request.newPassword())) {
            // 1) 현재 비밀번호 필수
            if (!StringUtils.hasText(request.currentPassword())) {
                throw new IllegalArgumentException("현재 비밀번호를 입력해 주세요.");
            }

            String trimmedCurrent = request.currentPassword().trim();
            String trimmedNew = request.newPassword().trim();
            
            // 2) 현재 비밀번호 검증
            if (!passwordEncoder.matches(trimmedCurrent, member.getPasswordHash())) {
                throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
            }

            // 3) 새 비밀번호 검증
            if (trimmedNew.length() < 8) {
                throw new IllegalArgumentException("새 비밀번호는 8자 이상이어야 합니다.");
            }
            if (trimmedCurrent.equals(trimmedNew)) {
                throw new IllegalArgumentException("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
            }
            if (passwordEncoder.matches(trimmedNew, member.getPasswordHash())) {
                throw new IllegalArgumentException("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
            }

            // 4) 비밀번호 변경 반영
            member.setPasswordHash(passwordEncoder.encode(trimmedNew));
        }

        // 최종 업데이트
        member.setEmail(nextEmail);
        member.setNickname(nextNickname);
        member.setName(nextName);
        member.setPhone(nextPhone);
        return member;
    }

    // 비밀번호 확인(재인증)
    @Transactional(readOnly = true)
    public void verifyCurrentPassword(Long memberId, String rawPassword) {
        // 1) 입력 필수
        if (!StringUtils.hasText(rawPassword)) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }

        // 2) 조회 후 비교
        Member member = getMember(memberId);
        if (!passwordEncoder.matches(rawPassword.trim(), member.getPasswordHash())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
    }

    // 회원 삭제
    @Transactional
    public void deleteMember(Long memberId) {
        if (memberId == null) {
            throw new IllegalArgumentException("유효하지 않은 회원 번호입니다.");
        }
        Member member = getMember(memberId);
        memberRepository.delete(member);
    }

    // 농장 등록 안내 모달 표시 여부 저장
    @Transactional
    public void markFarmPromptShown(Long memberId) {
        Member member = getMember(memberId);
        if (!member.isFarmPromptShown()) {
            member.setFarmPromptShown(true);
        }
    }

    // 이메일 중복 여부 체크
    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        String sanitized = sanitizeEmail(email);
        if (!StringUtils.hasText(sanitized)) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }
        return !memberRepository.existsByEmail(sanitized);
    }

    // 회원 타입(PERSONAL/FARMER)에 따른 기본 권한 매핑
    private UserRole resolveRole(MemberType memberType) {
        if (memberType == null) {
            return UserRole.USER;
        }
        return memberType == MemberType.FARMER ? UserRole.FARMER : UserRole.USER;
    }
}
