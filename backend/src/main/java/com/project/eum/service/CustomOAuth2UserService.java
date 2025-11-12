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

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final MemberRepository memberRepository;

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

        Optional<Member> optionalMember = memberRepository.findByEmail(normalizedEmail);

        if (optionalMember.isEmpty()) {
            attributes.put("needsSignup", true);
            attributes.put("email", normalizedEmail);
            List<GrantedAuthority> authorities =
                    List.of(new SimpleGrantedAuthority(UserRole.USER.name()));
            return new DefaultOAuth2User(authorities, attributes, "email");
        }

        Member member = optionalMember.get();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        attributes.put("needsSignup", false);
        attributes.put("memberId", member.getUserId());
        attributes.put("nickname", member.getNickname());
        attributes.put("name", member.getName());

        return new DefaultOAuth2User(authorities, attributes, "email");
    }
}
