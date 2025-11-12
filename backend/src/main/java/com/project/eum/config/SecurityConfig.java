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

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

  private final CustomOAuth2UserService customOAuth2UserService;
  private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
  private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    // 단순 데모 단계라 CSRF 와 인증을 모두 비활성화
    http.csrf(csrf -> csrf.disable());
    http.authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
            .requestMatchers("/api/auth/**", "/oauth2/**", "/login/oauth2/**").permitAll()
            .anyRequest().permitAll()
    ).oauth2Login(oauth -> oauth
            .authorizationEndpoint(config -> config.baseUri("/oauth2/authorization"))
            .redirectionEndpoint(redir -> redir.baseUri("/login/oauth2/code/*"))
            .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
            .successHandler(oAuth2LoginSuccessHandler)
            .failureHandler(oAuth2LoginFailureHandler)
    );
    return http.build();
  }

}
