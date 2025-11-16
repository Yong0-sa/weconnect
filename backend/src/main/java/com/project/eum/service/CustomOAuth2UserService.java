package com.project.eum.service;

import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * OAuth2 로그인 시 사용자 정보를 불러오고,
 * 신규/기존 회원 여부를 판단하여 attributes에 추가하는 서비스.
 * - needsSignup=true → 회원가입 진행 필요
 * - needsSignup=false → 기존 회원 정보 로딩
 */
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final MemberRepository memberRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 기본 OAuth2UserService로부터 구글 사용자 정보 가져오기
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        // OAuth2 provider(Google)로부터 받은 attribute 복사
        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        
        // 이메일 추출
        String email = (String) attributes.get("email");
        if (!StringUtils.hasText(email)) {
            // 이메일 정보가 없으면 인증 실패 처리
            OAuth2Error error = new OAuth2Error(
                    "google_email_missing",
                    "구글 계정에서 이메일을 가져오지 못했습니다.",
                    null
            );
            throw new OAuth2AuthenticationException(error);
        }

        // 이메일 통일된 형식으로 정규화
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        // 기존 회원 여부 확인
        Optional<Member> optionalMember = memberRepository.findByEmail(normalizedEmail);

        /** ---------------------------
         *  신규 회원(OAuth2 첫 로그인)
         * --------------------------- */
        if (optionalMember.isEmpty()) {
            // 이후 SuccessHandler에서 회원가입 라우팅에 사용
            attributes.put("needsSignup", true);
            attributes.put("email", normalizedEmail);

            // 기본 역할 USER 부여 후 반환
            List<GrantedAuthority> authorities =
                    List.of(new SimpleGrantedAuthority(UserRole.USER.name()));
            return new DefaultOAuth2User(authorities, attributes, "email");
        }

        /** ---------------------------
         *  기존 회원 → 정식 로그인 처리
         * --------------------------- */
        Member member = optionalMember.get();

        // 해당 사용자의 권한(Role) 적용
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        attributes.put("needsSignup", false);
        attributes.put("memberId", member.getUserId());
        attributes.put("nickname", member.getNickname());
        attributes.put("name", member.getName());

        // email을 key attribute로 사용
        return new DefaultOAuth2User(authorities, attributes, "email");
    }
}
