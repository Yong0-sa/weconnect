// (선택) CorsConfig.java — 전역 CORS
package com.project.eum.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration // 스프링 설정 클래스임을 명시 (Bean 등록용)
public class CorsConfig {
  // 프론트 개발 서버에서 오는 요청을 허용하기 위한 필터 빈
  @Bean // CORS 설정을 빈으로 등록 → 전역 적용 가능
  public CorsFilter corsFilter() {
    // CORS 정책 설정 객체 생성
    CorsConfiguration cfg = new CorsConfiguration();
    
    // 필요 시 특정 도메인만 등록 가능
    cfg.addAllowedOriginPattern("http://localhost:5173");
    
    // 모든 헤더 허용
    cfg.addAllowedHeader("*");
    
    // 모든 HTTP 메서드 허용 (GET, POST, PUT, DELETE 등)
    cfg.addAllowedMethod("*");

    // 서버 간 요청 시 쿠키/헤더 등 인증 정보를 허용
    cfg.setAllowCredentials(true);

    // CORS 설정을 특정 URL 패턴에 매핑 (/api/** 등)
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    
    // 모든 경로에 대해 위의 설정 적용
    source.registerCorsConfiguration("/**", cfg);
    
    // CorsFilter 생성 및 등록
    return new CorsFilter(source);
  }
}
