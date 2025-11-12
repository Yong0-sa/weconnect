package com.project.eum.service;

import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private static final String DEFAULT_PHONE_PLACEHOLDER = "010-0000-0000";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        String email = (String) attributes.get("email");
        if (!StringUtils.hasText(email)) {
            OAuth2Error error = new OAuth2Error(
                    "google_email_missing",
                    "구글 계정에서 이메일을 가져오지 못했습니다.",
                    null
            );
            throw new OAuth2AuthenticationException(error);
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        Member member = memberRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> registerNewSocialMember(normalizedEmail, attributes));

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        attributes.put("memberId", member.getUserId());
        attributes.put("nickname", member.getNickname());
        boolean needsProfileCompletion = !StringUtils.hasText(member.getPhone())
                || DEFAULT_PHONE_PLACEHOLDER.equals(member.getPhone())
                || "010-1234-1234".equals(member.getPhone());
        attributes.put("needsProfileCompletion", needsProfileCompletion);

        return new DefaultOAuth2User(authorities, attributes, "email");
    }

    private Member registerNewSocialMember(String email, Map<String, Object> attributes) {
        String defaultNickname = extractPreferredNickname(attributes);
        String nickname = generateUniqueNickname(defaultNickname);
        String name = Optional.ofNullable((String) attributes.get("name"))
                .filter(StringUtils::hasText)
                .orElse(nickname);

        Member member = Member.builder()
                .email(email)
                .nickname(nickname)
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .name(name)
                .phone(DEFAULT_PHONE_PLACEHOLDER)
                .role(UserRole.USER)
                .build();

        return memberRepository.save(member);
    }

    private String extractPreferredNickname(Map<String, Object> attributes) {
        for (String key : List.of("nickname", "given_name", "name")) {
            Object value = attributes.get(key);
            if (value instanceof String str && StringUtils.hasText(str)) {
                return str.replaceAll("\\s+", "");
            }
        }
        return "weconnect";
    }

    private String generateUniqueNickname(String base) {
        String cleaned = StringUtils.hasText(base) ? base : "weconnect";
        String candidate = cleaned;
        int suffix = 1;
        while (memberRepository.existsByNickname(candidate)) {
            candidate = cleaned + suffix;
            suffix++;
        }
        return candidate;
    }
}
