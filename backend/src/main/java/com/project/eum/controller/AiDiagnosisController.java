package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.diagnosis.Diagnosis;
import com.project.eum.dto.AiDiagnosisResponse;
import com.project.eum.service.AiDiagnosisService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * AI 작물 진단 관련 REST API 컨트롤러
 * 작물 이미지를 분석하여 질병을 진단하고 관리 방법을 제공합니다.
 */
@Slf4j
@RestController
@RequestMapping({"/api/ai", "/ai"})  // nginx가 /api/를 제거하고 전달하므로 /ai도 지원
@RequiredArgsConstructor
public class AiDiagnosisController {

    private final AiDiagnosisService aiDiagnosisService;

    /**
     * 작물 진단 요청
     * AI 서버에 이미지를 전송하여 작물 질병을 진단하고 결과를 DB에 저장합니다.
     * @param cropType 작물 타입 (apple, tomato)
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
        log.info("진단 요청 수신: cropType={}, imageSize={}, sessionId={}",
                cropType, image != null ? image.getSize() : 0, session.getId());

        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            log.warn("로그인하지 않은 사용자의 진단 요청");
            AiDiagnosisResponse error = new AiDiagnosisResponse(
                    false, cropType, "", -1, 0.0, "로그인 후 이용해 주세요.", ""
            );
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        log.info("진단 서비스 호출 시작: memberId={}, cropType={}", memberId, cropType);
        // 서비스 호출
        AiDiagnosisResponse response = aiDiagnosisService.diagnose(cropType, image, memberId);

        log.info("진단 서비스 응답: success={}, label={}", response.isSuccess(), response.getLabel());
        // 응답 반환
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 사용자의 진단 내역 목록 조회
     * @param session HTTP 세션
     * @return 진단 내역 목록 (최신순)
     */
    @GetMapping("/diagnosis/history")
    public ResponseEntity<List<Diagnosis>> getDiagnosisHistory(HttpSession session) {
        log.info("진단 내역 목록 조회 요청: sessionId={}", session.getId());

        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            log.warn("로그인하지 않은 사용자의 진단 내역 조회 요청");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<Diagnosis> history = aiDiagnosisService.getDiagnosisHistory(memberId);
        log.info("진단 내역 조회 완료: userId={}, count={}", memberId, history.size());
        return ResponseEntity.ok(history);
    }

    /**
     * 진단 내역 삭제 (사용자 본인만)
     */
    @DeleteMapping("/diagnosis/{diagnosisId}")
    public ResponseEntity<Void> deleteDiagnosis(
            @PathVariable Long diagnosisId,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            log.warn("로그인하지 않은 사용자의 진단 내역 삭제 시도");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            aiDiagnosisService.deleteDiagnosis(diagnosisId, memberId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            log.warn("삭제 대상 진단을 찾을 수 없음: diagnosisId={}, userId={}", diagnosisId, memberId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("진단 삭제 실패: diagnosisId={}, userId={}, error={}", diagnosisId, memberId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
