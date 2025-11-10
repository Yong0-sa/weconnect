// SecurityConfig.java
package com.project.eum.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    // 단순 데모 단계라 CSRF 와 인증을 모두 비활성화
    http.csrf(csrf -> csrf.disable());
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
        .anyRequest().permitAll()
    );
    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    // BCrypt 를 기본 패스워드 인코딩 전략으로 사용
    return new BCryptPasswordEncoder();
  }
}
