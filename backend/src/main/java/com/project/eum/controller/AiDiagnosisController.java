package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.AiDiagnosisResponse;
import com.project.eum.service.AiDiagnosisService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * AI 작물 진단 관련 REST API 컨트롤러
 * 작물 이미지를 분석하여 질병을 진단하고 관리 방법을 제공합니다.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiDiagnosisController {

    private final AiDiagnosisService aiDiagnosisService;

    /**
     * 작물 진단 요청
     * AI 서버에 이미지를 전송하여 작물 질병을 진단하고 결과를 DB에 저장합니다.
     * @param cropType 작물 타입 (potato, paprika, tomato)
     * @param image 작물 이미지 파일
     * @param session HTTP 세션
     * @return 진단 결과
     */
    @PostMapping("/diagnosis")
    public ResponseEntity<AiDiagnosisResponse> diagnoseCrop(
            @RequestParam("cropType") String cropType,
            @RequestParam("image") MultipartFile image,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            AiDiagnosisResponse error = new AiDiagnosisResponse(
                    false, cropType, "", -1, 0.0, "로그인 후 이용해 주세요.", ""
            );
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        // 서비스 호출
        AiDiagnosisResponse response = aiDiagnosisService.diagnose(cropType, image, memberId);
        
        // 응답 반환
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
