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

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Long signUp(SignUpRequest req) {
        if (memberRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        if (memberRepository.existsByNickname(req.getNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

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

    private UserRole resolveRole(MemberType memberType) {
        if (memberType == null) {
            return UserRole.USER;
        }
        return memberType == MemberType.FARMER ? UserRole.FARMER : UserRole.USER;
    }
}
