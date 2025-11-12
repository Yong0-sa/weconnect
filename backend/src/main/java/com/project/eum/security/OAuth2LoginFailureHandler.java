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

@Component
@RequiredArgsConstructor
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    @Value("${app.oauth2.frontend-failure-uri:http://localhost:5173/login}")
    private String frontendFailureUri;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        String message = Optional.ofNullable(exception.getMessage()).orElse("소셜 로그인에 실패했습니다.");

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendFailureUri)
                .queryParam("status", "error")
                .queryParam("message", message)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
