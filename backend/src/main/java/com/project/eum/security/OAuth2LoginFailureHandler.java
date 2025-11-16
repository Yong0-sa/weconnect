package com.project.eum.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;


/**
 * OAuth2 로그인 실패 시 프론트엔드로 리다이렉트하는 핸들러.
 * - 실패 메시지 포함하여 /login 페이지로 이동
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    // 실패 시 이동할 프론트엔드 주소 (환경변수에서 가져오고 기본값 제공)
    @Value("${app.oauth2.frontend-failure-uri:http://localhost:5173/login}")
    private String frontendFailureUri;

    // OAuth2 인증이 실패했을 때 실행됨
    // 실패 메시지를 쿼리 파라미터로 담아 프론트로 전달
    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        // 예외 메시지가 없을 경우 기본 메시지 사용
        String message = Optional.ofNullable(exception.getMessage()).orElse("소셜 로그인에 실패했습니다.");

        // /login?status=error&message=... 형태의 URL 생성
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendFailureUri)
                .queryParam("status", "error")
                .queryParam("message", message)
                .build()
                .toUriString();

        // 프론트로 redirect
        response.sendRedirect(redirectUrl);
    }
}
