// SecurityConfig.java
package com.project.eum.config;

import com.project.eum.security.OAuth2LoginFailureHandler;
import com.project.eum.security.OAuth2LoginSuccessHandler;
import com.project.eum.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration  // 스프링 설정 클래스
@RequiredArgsConstructor  // final 필드 자동 주입 (생성자 생성)
public class SecurityConfig {

  private final CustomOAuth2UserService customOAuth2UserService;
  private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
  private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    // CSRF(Cross-Site Request Forgery) 비활성화
    http.csrf(csrf -> csrf.disable());

    // 요청별 인가 규칙 설정
    http.authorizeHttpRequests(auth -> auth
            // 정적 리소스 (이미지, 동영상 등) 먼저 허용 - Spring Security 필터 통과
            .requestMatchers("/assets/**", "/static/**", "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.webm", "/*.mp4").permitAll()
            // 회원가입, 로그인 등 인증 불필요한 엔드포인트는 허용
            .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
            // OAuth2 관련 엔드포인트 전부 허용
            .requestMatchers("/api/auth/**", "/oauth2/**", "/login/oauth2/**").permitAll()
            .requestMatchers("/assets/**", "/static/**", "/*.png", "/*.jpg", "/*.webm").permitAll()            
            // 그 외 모든 요청은 인증 필요
            .anyRequest().permitAll()
    
    // OAuth2 로그인 플로우 설정        
    ).oauth2Login(oauth -> oauth
            // 인가 요청 시작 URI (클라이언트가 이 경로로 진입)
            .authorizationEndpoint(config -> config.baseUri("/oauth2/authorization"))
            // OAuth2 제공자에서 콜백으로 되돌아올 URI 패턴
            .redirectionEndpoint(redir -> redir.baseUri("/login/oauth2/code/*"))
            // 소셜 프로바이더에서 받은 사용자 정보를 우리 도메인 객체로 매핑
            .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
            // 로그인 성공/실패 후 처리기
            .successHandler(oAuth2LoginSuccessHandler)
            .failureHandler(oAuth2LoginFailureHandler)
    );
    return http.build();
  }

}
