package com.project.eum.controller;

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