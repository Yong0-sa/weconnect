package com.project.eum.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration // 스프링 설정 클래스임을 명시 (Bean 등록용)
public class PasswordEncoderConfig {

    @Bean // PasswordEncoder를 스프링 컨테이너에 Bean으로 등록
    public PasswordEncoder passwordEncoder() {
        // BCryptPasswordEncoder: 비밀번호를 단방향 해시 방식으로 암호화 (보안 강도 높음)
        return new BCryptPasswordEncoder();
    }
}
