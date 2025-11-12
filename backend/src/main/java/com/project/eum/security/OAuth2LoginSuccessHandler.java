package com.project.eum.security;

import com.project.eum.config.SessionConst;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final MemberRepository memberRepository;

    @Value("${app.oauth2.frontend-success-uri:http://localhost:5173/oauth/success}")
    private String frontendSuccessUri;

    @Value("${app.oauth2.profile-complete-uri:http://localhost:5173/profile/complete}")
    private String profileCompleteUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = authToken.getPrincipal();
        String email = principal.getAttribute("email");
        if (email == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "이메일 정보를 확인할 수 없습니다.");
            return;
        }
        Member member = memberRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalStateException("회원 정보를 찾을 수 없습니다."));

        HttpSession session = request.getSession(true);
        session.setAttribute(SessionConst.LOGIN_MEMBER_ID, member.getUserId());
        session.setAttribute(SessionConst.LOGIN_MEMBER_ROLE, member.getRole());

        String issuedToken = UUID.randomUUID().toString();

        Boolean needsProfileCompletion = principal.getAttribute("needsProfileCompletion");

        String baseRedirect = Boolean.TRUE.equals(needsProfileCompletion)
                ? profileCompleteUri
                : frontendSuccessUri;

        String redirectUrl = UriComponentsBuilder.fromUriString(baseRedirect)
                .queryParam("status", "success")
                .queryParam("token", issuedToken)
                .queryParam("email", email)
                .queryParam("needsProfileCompletion", Boolean.TRUE.equals(needsProfileCompletion))
                .build(true)
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
