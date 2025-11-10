package com.project.eum.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.Map;

@RestController
@RequestMapping("/ai") // nginx가 /api/를 제거하고 전달하므로 /ai만 사용
public class aiTest {

    @Value("${ai.server.url}")
    private String aiServerUrl;

    // 간단한 프록시 호출에만 사용하므로 RestTemplate 을 재사용한다
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/test")
    public String test() {
        // 헬스체크 용도의 가장 단순한 응답
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
        // 프론트 요청 바디를 그대로 AI 서버의 검색 API 로 전달한다
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> req = new HttpEntity<>(body, headers);

        String url = aiServerUrl + "/api/ai/search";  // 예: http://10.171.4.7:8000

        return restTemplate.exchange(url, HttpMethod.POST, req, String.class);
    }


}