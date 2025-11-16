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


/**
 * OAuth2 로그인 성공 시 실행되는 핸들러.
 * - 신규 사용자면 /signup 으로 안내
 * - 기존 사용자면 세션 생성 후 프론트로 성공 리다이렉트
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final MemberRepository memberRepository;

    // 로그인 성공 후 이동할 프론트엔드 주소
    @Value("${app.oauth2.frontend-success-uri:http://localhost:5173/oauth/success}")
    private String frontendSuccessUri;

    // 소셜 가입(회원정보 부족) 시 이동할 주소
    @Value("${app.oauth2.signup-uri:http://localhost:5173/signup}")
    private String signupUri;


    //   OAuth2 인증 성공 후
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = authToken.getPrincipal();

        // 소셜에서 가져온 이메일
        String email = principal.getAttribute("email");
        if (email == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "이메일 정보를 확인할 수 없습니다.");
            return;
        }

        // 신규 가입 필요 여부 체크(needsSignup 플래그)
        Object needsSignupAttr = principal.getAttribute("needsSignup");
        boolean needsSignup = needsSignupAttr != null && Boolean.parseBoolean(needsSignupAttr.toString());
        
        // 1) 신규 가입 필요 → 프론트 signup 페이지로 리다이렉트
        if (needsSignup) {
            String provider = authToken.getAuthorizedClientRegistrationId();
            String redirectUrl = UriComponentsBuilder.fromUriString(signupUri)
                    .queryParam("status", "social_signup")
                    .queryParam("provider", provider)
                    .queryParam("email", email)
                    .build()
                    .toUriString();
            response.sendRedirect(redirectUrl);
            return;
        }

        // 2) 기존 회원 → Member 조회
        Member member = memberRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalStateException("회원 정보를 찾을 수 없습니다."));

        // 세션 생성 및 로그인 정보 저장
        HttpSession session = request.getSession(true);
        session.setAttribute(SessionConst.LOGIN_MEMBER_ID, member.getUserId());
        session.setAttribute(SessionConst.LOGIN_MEMBER_ROLE, member.getRole());

        // 프론트로 보낼 임시 토큰(세션과 별개, 클라이언트 로직용)
        String issuedToken = UUID.randomUUID().toString();

        // 3) 성공 페이지로 리다이렉트
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendSuccessUri)
                .queryParam("status", "success")
                .queryParam("token", issuedToken)
                .queryParam("email", email)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
