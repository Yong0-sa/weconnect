package com.project.eum.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    // 배포 상태를 빠르게 확인하기 위한 샘플 엔드포인트 모음
    @GetMapping("/")
    public String home() {
        // 루트 요청 시 간단한 상태 메시지를 반환
        return "EUM Backend Server is running!";
    }

    @GetMapping("/api/hello")
    public String hello() {
        // 프론트에서 API 프록시 테스트 용도로 사용
        return "Hello from Spring Boot!";
    }
}