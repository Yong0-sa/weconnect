package com.project.eum.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/ai") // nginx가 /api/를 제거하고 전달하므로 /ai만 사용
public class aiTest {

    @Value("${ai.server.url}")
    private String aiServerUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/test")
    public String test() {
        return "AI Server Connection Test";
    }

    // AI 서버에서 Hello World 메시지를 가져오는 엔드포인트
    @GetMapping("/hello")
    public String getHelloFromAI() {
        try {
            // AI 서버의 "/" 엔드포인트 호출
            Map<String, String> response = restTemplate.getForObject(aiServerUrl + "/", Map.class);
            // AI 서버에서 받은 message 값 반환
            return response != null ? response.get("message") : "No message from AI server";
        } catch (Exception e) {
            return "Error connecting to AI server: " + e.getMessage();
        }
    }

    @PostMapping("/search")
    public ResponseEntity<String> proxy(@RequestBody String body) {
        return restTemplate.postForEntity(aiServerUrl + "/api/ai/search", body, String.class);
    }

}