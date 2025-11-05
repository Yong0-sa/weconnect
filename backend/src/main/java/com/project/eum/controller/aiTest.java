package com.project.eum.controller;

// 이 부분이 없어서 에러! 추가 필요!
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/ai")
public class aiTest {

    @Value("${ai.server.url}")
    private String aiServerUrl;

    @PostMapping("/query")
    public ResponseEntity<?> queryAI(@RequestBody QueryRequest request) {
        RestTemplate restTemplate = new RestTemplate();
        String url = aiServerUrl + "/query";

        ResponseEntity<String> response = restTemplate.postForEntity(
                url, request, String.class
        );

        return ResponseEntity.ok(response.getBody());
    }
}