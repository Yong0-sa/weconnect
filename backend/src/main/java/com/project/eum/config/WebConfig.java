package com.project.eum.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration  // 스프링 MVC 설정 클래스
public class WebConfig implements WebMvcConfigurer {

    // 전역 CORS 설정 (Cross-Origin Resource Sharing)
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 프론트 개발 서버 주소만 허용해 불필요한 외부 도메인 접근을 차단
        registry.addMapping("/**")
                // 프론트엔드 개발 서버(로컬 Vite)만 허용
                .allowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173"
                )
                // 허용할 HTTP 메서드 지정
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                // 모든 요청 헤더 허용
                .allowedHeaders("*")
                // 인증 정보(쿠키, Authorization 헤더 등) 허용
                .allowCredentials(true);
    }
}
