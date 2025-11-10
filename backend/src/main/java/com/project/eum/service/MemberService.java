package com.project.eum.service;

import com.project.eum.dto.SignUpRequest;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.MemberType;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MemberService {

    // 회원 가입과 관련된 주요 비즈니스 로직을 담당한다.
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Long signUp(SignUpRequest req) {
        // 기본 중복 검사를 통과하지 못하면 즉시 예외를 던진다
        if (memberRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        if (memberRepository.existsByNickname(req.getNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        // 요청 값을 정제한 뒤 영속화할 회원 엔티티를 조립한다
        Member member = Member.builder()
                .email(req.getEmail().trim().toLowerCase())
                .nickname(req.getNickname().trim())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .name(req.getName().trim())
                .phone(req.getPhone().trim())
                .role(resolveRole(req.getMemberType()))
                .build();

        memberRepository.save(member);
        return member.getUserId();
    }

    @Transactional(readOnly = true)
    // 로그인 시 이메일/비밀번호를 검증한다
    public Member authenticate(String email, String rawPassword) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(rawPassword)) {
            throw new IllegalArgumentException("이메일과 비밀번호를 모두 입력해 주세요.");
        }

        String sanitizedEmail = email.trim().toLowerCase();

        Member member = memberRepository.findByEmail(sanitizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("로그인 정보가 일치하지 않습니다."));

        if (!passwordEncoder.matches(rawPassword, member.getPasswordHash())) {
            throw new IllegalArgumentException("로그인 정보가 일치하지 않습니다.");
        }

        return member;
    }

    private UserRole resolveRole(MemberType memberType) {
        // 요청된 회원 유형에 따라 기본 권한을 매핑한다
        if (memberType == null) {
            return UserRole.USER;
        }
        return memberType == MemberType.FARMER ? UserRole.FARMER : UserRole.USER;
    }
}
