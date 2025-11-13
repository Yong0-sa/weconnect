package com.project.eum.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.eum.diagnosis.Diagnosis;
import com.project.eum.diagnosis.DiagnosisRepository;
import com.project.eum.dto.AiDiagnosisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * AI 작물 진단 관련 비즈니스 로직을 처리하는 서비스
 * 외부 AI 서버와 통신하여 작물 질병을 진단하고 결과를 DB에 저장합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiDiagnosisService {

    private final DiagnosisRepository diagnosisRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** AI 서버 URL (application.properties에서 설정) */
    @Value("${ai.predict.server.url:http://10.171.4.7:8000/predict}")
    private String aiServerBaseUrl;

    /**
     * 작물 진단 수행
     * AI 서버에 이미지를 전송하여 질병을 진단하고 결과를 DB에 저장합니다.
     * @param cropType 작물 타입 (potato, paprika, tomato)
     * @param image 작물 이미지 파일
     * @param userId 사용자 ID
     * @return 진단 결과
     */
    @Transactional
    public AiDiagnosisResponse diagnose(String cropType, MultipartFile image, Long userId) {
        if (image == null || image.isEmpty()) {
            return createErrorResponse(cropType, "이미지 파일이 없습니다.");
        }

        String cropEndpoint = getCropEndpoint(cropType);
        if (cropEndpoint == null) {
            return createErrorResponse(cropType, "지원하지 않는 작물 타입입니다.");
        }

        try {
            String aiServerUrl = aiServerBaseUrl + "/" + cropEndpoint;
            log.info("AI 서버 진단 요청: URL={}, 작물타입={}, 사용자ID={}", aiServerUrl, cropType, userId);

            HttpEntity<MultiValueMap<String, Object>> request = createRequest(image);
            ResponseEntity<String> response = restTemplate.postForEntity(aiServerUrl, request, String.class);

            log.info("AI 서버 응답 상태: {}", response.getStatusCode());
            log.debug("AI 서버 응답 본문: {}", response.getBody());

            if (response.getBody() == null || response.getBody().isBlank()) {
                log.error("AI 서버 응답이 비어있습니다.");
                return createErrorResponse(cropType, "AI 서버로부터 응답을 받지 못했습니다.");
            }

            JsonNode json = objectMapper.readTree(response.getBody());
            int predictedIndex = json.path("predicted_index").asInt(-1);
            double confidence = json.path("confidence").asDouble(0.0);
            String message = json.path("message").asText("");

            log.info("AI 서버 응답 파싱: predictedIndex={}, confidence={}, message={}",
                    predictedIndex, confidence, message);

            if (message.isBlank()) {
                message = "분석이 완료되었습니다.";
            }

            if (predictedIndex < 0) {
                log.warn("AI 서버에서 오류 응답: predictedIndex={}, message={}", predictedIndex, message);
                return createErrorResponse(cropType, message);
            }

            String label = getLabel(cropType, predictedIndex, json);
            String careComment = getCareComment(label);
            String photoUrl = getImageUrl(json);

            log.info("진단 결과: label={}, careComment 길이={}, photoUrl={}",
                    label, careComment != null ? careComment.length() : 0, photoUrl);

            saveDiagnosis(userId, cropType, label, careComment, photoUrl);

            AiDiagnosisResponse result = new AiDiagnosisResponse(true, cropType, label, predictedIndex, confidence, message, careComment);
            log.info("진단 완료: success={}, label={}", result.isSuccess(), result.getLabel());
            return result;

        } catch (IOException e) {
            log.error("파일 처리 중 오류 발생", e);
            return createErrorResponse(cropType, "파일 처리 중 오류가 발생했습니다: " + e.getMessage());
        } catch (Exception e) {
            log.error("AI 서버 연결 실패: URL={}, 작물타입={}", aiServerBaseUrl + "/" + cropEndpoint, cropType, e);
            return createErrorResponse(cropType, "AI 서버 연결 실패: " + e.getMessage());
        }
    }

    /**
     * AI 서버로 전송할 Multipart 요청 생성
     * @param file 이미지 파일
     * @return HttpEntity
     * @throws IOException 파일 읽기 오류 시
     */
    private HttpEntity<MultiValueMap<String, Object>> createRequest(MultipartFile file) throws IOException {
        // MultipartFile을 Resource로 변환
        Resource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return new HttpEntity<>(body, headers);
    }

    /**
     * 작물 타입을 AI 서버 엔드포인트로 변환
     * @param cropType 작물 타입
     * @return AI 서버 엔드포인트 (null이면 지원하지 않는 타입)
     */
    private String getCropEndpoint(String cropType) {
        return switch (cropType) {
            case "potato" -> "potato";
            case "paprika" -> "pepperbell";
            case "tomato" -> "tomato";
            default -> null;
        };
    }

    /**
     * 작물 타입과 예측 인덱스로 질병 라벨 이름 가져오기
     * @param cropType 작물 타입
     * @param index 예측 인덱스
     * @param json AI 서버 응답 JSON
     * @return 질병 라벨 이름
     */
    private String getLabel(String cropType, int index, JsonNode json) {
        String[] labels = getLabels(cropType);
        if (index >= 0 && index < labels.length) {
            return labels[index];
        }
        String labelFromJson = json.path("label").asText("");
        return labelFromJson.isBlank() ? "" : labelFromJson;
    }

    /**
     * 작물별 질병 라벨 배열 반환
     * @param cropType 작물 타입
     * @return 질병 라벨 배열
     */
    private String[] getLabels(String cropType) {
        return switch (cropType) {
            case "potato" -> new String[]{
                    "감자 갈색무늬병(조기마름병)",
                    "감자 역병",
                    "감자 건강한 잎"
            };
            case "paprika" -> new String[]{
                    "파프리카 세균성 점무늬병",
                    "파프리카 건강한 잎"
            };
            case "tomato" -> new String[]{
                    "토마토 세균성 점무늬병",
                    "토마토 잎마름병(조기마름병)",
                    "토마토 역병",
                    "토마토 잎곰팡이병",
                    "토마토 세포리아 잎반점병",
                    "토마토 거미응애 피해",
                    "토마토 탄저병",
                    "토마토 황화잎말림바이러스병",
                    "토마토 모자이크바이러스병",
                    "토마토 건강한 잎"
            };
            default -> new String[0];
        };
    }

    /**
     * 질병 라벨에 따른 관리 방법 가져오기
     * @param label 질병 라벨 이름
     * @return 관리 방법 설명
     */
    private String getCareComment(String label) {
        if (label == null || label.isBlank()) {
            return "해당 작물은 통풍을 확보하고 과습을 피하면서 주기적으로 상태를 확인하세요.";
        }

        if (label.contains("파프리카 세균성 점무늬병")) {
            return "감염 잎을 제거하고 물방울이 튀지 않도록 관수하며 구리계 농약을 살포하세요. 연작은 피하는 것이 좋습니다.";
        }
        if (label.contains("파프리카 건강한 잎")) {
            return "통풍을 유지하고 과습을 피하면서 영양 균형을 맞춰 관리하세요.";
        }
        if (label.contains("감자 갈색무늬병")) {
            return "병든 잎을 바로 제거하고 디티오카바메이트계나 클로로탈로닐 살균제를 살포하세요. 질소 비료는 과하게 주지 마세요.";
        }
        if (label.contains("감자 역병")) {
            return "습도가 높을 때 예방 살균제를 살포하고 감염된 줄기와 괴경을 제거하세요. 통풍과 배수를 확보하세요.";
        }
        if (label.contains("감자 건강한 잎")) {
            return "배수가 잘되는 토양을 유지하고 작물을 정기적으로 점검하세요.";
        }
        if (label.contains("토마토 세균성 점무늬병")) {
            return "감염 잎을 제거하고 구리계 살균제를 살포하세요. 종자는 소독하고 잎이 젖지 않게 관수하세요.";
        }
        if (label.contains("토마토 잎마름병")) {
            return "병든 잎을 제거하고 가지치기로 통풍을 확보한 뒤 클로로탈로닐이나 보르도액을 살포하세요.";
        }
        if (label.contains("토마토 역병")) {
            return "습도를 낮추고 예방 살균제를 살포하며 연작을 피하세요. 배수가 잘되도록 관리하세요.";
        }
        if (label.contains("토마토 잎곰팡이병")) {
            return "온실 습도를 60% 이하로 낮추고 환기를 강화하세요. 필요 시 예방 살균제를 살포하세요.";
        }
        if (label.contains("토마토 세포리아 잎반점병")) {
            return "감염 잎을 제거하고 통풍을 확보하세요. 만코제브나 클로로탈로닐 등 예방 살균제를 사용하세요.";
        }
        if (label.contains("토마토 모자이크바이러스병")) {
            return "감염 식물을 즉시 제거하고 손과 도구를 소독하세요. 담배에 닿은 손으로 작물을 만지지 말고 내병성 품종을 선택하세요.";
        }
        if (label.contains("토마토 황화잎말림바이러스병")) {
            return "감염 식물을 제거하고 담배가루이를 끈끈이 트랩이나 살충제로 방제하세요. 내병성 품종을 심는 것이 좋습니다.";
        }
        if (label.contains("토마토 거미응애")) {
            return "잎 뒷면을 물 분무로 씻어주고 필요하면 등록 살충제를 사용하세요. 건조한 환경을 피하세요.";
        }
        if (label.contains("토마토 탄저병")) {
            return "감염 부위를 제거하고 통풍을 개선하며 살균제를 살포하세요.";
        }
        if (label.contains("토마토 건강한 잎")) {
            return "적정 온도(20~25℃)와 습도를 유지하고 과습을 피하면서 균형 잡힌 영양을 공급하세요.";
        }

        return "해당 작물은 통풍을 확보하고 과습을 피하면서 주기적으로 상태를 확인하세요.";
    }

    /**
     * AI 서버 응답에서 이미지 URL 추출
     * @param json AI 서버 응답 JSON
     * @return 이미지 URL (없으면 null)
     */
    private String getImageUrl(JsonNode json) {
        String url = json.path("image_url").asText(null);
        if (url == null || url.isBlank()) {
            url = json.path("photo_url").asText(null);
        }
        return url;
    }

    /**
     * 진단 결과를 DB에 저장
     * @param userId 사용자 ID
     * @param cropName 작물 이름
     * @param diseaseName 질병 이름
     * @param recommendation 관리 방법
     * @param photoUrl 이미지 URL
     */
    private void saveDiagnosis(Long userId, String cropName, String diseaseName, String recommendation, String photoUrl) {
        Diagnosis diagnosis = Diagnosis.builder()
                .userId(userId)
                .cropName(cropName)
                .photoUrl(photoUrl)
                .diseaseName(diseaseName)
                .recommendation(recommendation)
                .build();
        diagnosisRepository.save(diagnosis);
    }

    /**
     * 에러 응답 생성
     * @param cropType 작물 타입
     * @param message 에러 메시지
     * @return 에러 응답
     */
    private AiDiagnosisResponse createErrorResponse(String cropType, String message) {
        return new AiDiagnosisResponse(false, cropType, "", -1, 0.0, message, "");
    }
}
