package com.project.eum.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.eum.diagnosis.Diagnosis;
import com.project.eum.diagnosis.DiagnosisRepository;
import com.project.eum.dto.AiDiagnosisResponse;
import com.project.eum.dto.DiaryRequest;
import com.project.eum.dto.DiaryResponse;
import com.project.eum.util.MultipartInputStreamFileResource;   // ← 반드시 필요
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiDiagnosisService {

    private final DiagnosisRepository diagnosisRepository;
    private final ObjectStorageService objectStorageService;
    private final DiaryService diaryService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GENERIC_CARE_TIP = "해당 작물은 통풍을 확보하고 과습을 피하면서 주기적으로 상태를 확인하세요.";

    private static final Map<String, String> DEFAULT_CARE_TIPS = Map.of(
            "apple", "사과는 감염 잎과 낙엽을 바로 제거하고 수관을 가볍게 전정해 통풍을 유지하세요.",
            "grape", "포도는 덩굴을 정리해 통풍을 높이고 잎이 젖은 상태가 오래가지 않도록 관리하세요.",
            "tomato", "토마토는 20~25℃의 온도와 낮은 습도를 유지하고 토양 과습을 피하면서 균형 잡힌 비료를 공급하세요."
    );

    private static final List<Map.Entry<String, String>> CARE_COMMENT_RULES = List.of(
            Map.entry("apple powdery mildew", "감염 잎을 바로 제거하고 통풍을 높이세요. 유황·구리계 살균제를 개화 직후 살포하면 확산을 억제할 수 있습니다."),
            Map.entry("apple rust", "주변 향나무 등 중간 기주를 관리하고 감염 잎을 제거하세요. 우기 전에 보호 살균제를 살포하면 전염을 줄일 수 있습니다."),
            Map.entry("apple scab", "낙엽과 병든 과실을 수거 후 소각하고, 비 예보 시 예방 살균제를 살포하세요. 과습을 줄이면 재감염이 감소합니다."),
            Map.entry("grape blackrot", "병반이 있는 잎과 송이를 조기에 제거하고 덩굴을 정리해 햇빛을 받게 하세요. 디티오카바메이트·스티로빌루린계 살균제를 교호 살포합니다."),
            Map.entry("grape esca", "갈변한 줄기·주지를 과감히 제거하고 절단면을 보호제로 처리하세요. 수분·비료 과다를 피하며 수세를 안정시킵니다."),
            Map.entry("grape leafblight", "밀집된 잎을 솎아 통풍을 확보하고, 이소프로티올란·벤조이미다졸계 살균제를 번갈아 살포하세요."),
            Map.entry("tomato bacterial spot", "씨앗과 도구를 소독하고 감염 잎은 즉시 제거하세요. 구리제나 스트렙토마이신계 약제를 번갈아 살포하면 균 확산을 막을 수 있습니다."),
            Map.entry("tomato early blight", "하엽을 제거해 통풍을 높이고 클로로탈로닐·디티오카바메이트계를 주기적으로 살포하세요. 잎에 물이 튀지 않게 점적관수합니다."),
            Map.entry("tomato late blight", "온실 습도를 낮추고 감염된 잎과 줄기를 제거하세요. 메탈락실·프로피네브 등 예방 약제를 우기 전에 살포하면 효과적입니다."),
            Map.entry("tomato leaf mold", "저녁 관수를 피하고 환기를 강화해 습도를 60% 이하로 유지하세요. 필요 시 구리계 약제를 살포해 포자 발아를 억제합니다."),
            Map.entry("tomato septoria leaf spot", "잎이 젖어 있는 시간을 줄이고 만코제브·클로로탈로닐을 교호 살포하세요. 병든 잎은 바로 제거해 포자원이 남지 않도록 합니다."),
            Map.entry("tomato spider mites two spotted spider mite", "잎 뒷면을 물로 세척하고 고온·건조 환경을 피하세요. 필요 시 아바멕틴 등 선택 살충제를 사용합니다."),
            Map.entry("tomato target spot", "밀식된 잎을 솎아내고 감염 잎을 제거하세요. 아족시스트로빈·디티오카바메이트계 살균제를 교대로 사용하면 도움이 됩니다."),
            Map.entry("tomato tomato yellow leaf curl virus", "감염 개체를 즉시 제거하고 담배가루이 방제를 위해 끈끈이 트랩과 살충제를 병행하세요. 반사 멀칭으로 매개충을 차단합니다."),
            Map.entry("tomato tomato mosaic virus", "작업 전후 손과 도구를 소독하고 감염주를 뽑아내세요. 내병성 품종과 깨끗한 묘를 사용하면 예방에 효과적입니다."),
            Map.entry("tomato healthy", "적정 온도와 습도를 유지하고 가지치기로 통풍을 확보하세요. 물과 비료는 소량씩 자주 공급해 스트레스를 줄입니다.")
    );

    @Value("${ai.server.url}")
    private String aiServerBaseUrl;

    /**
     * AI 서버로 전송할 Multipart 요청 생성
     * (413 에러 해결 버전: InputStream 기반 전송)
     */
    private HttpEntity<MultiValueMap<String, Object>> createRequest(MultipartFile file) throws IOException {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        MultipartInputStreamFileResource fileResource =
                new MultipartInputStreamFileResource(file.getInputStream(), file.getOriginalFilename());

        body.add("file", fileResource);

        return new HttpEntity<>(body, headers);
    }


    @Transactional
    public AiDiagnosisResponse diagnose(String cropType, MultipartFile image, Long userId) {
        String normalizedCropType = cropType == null ? "" : cropType.trim().toLowerCase(Locale.ROOT);
        if (image == null || image.isEmpty()) {
            return createErrorResponse(normalizedCropType, "이미지 파일이 없습니다.");
        }

        if (!StringUtils.hasText(normalizedCropType)) {
            return createErrorResponse(normalizedCropType, "작물 타입을 선택해 주세요.");
        }

        String cropEndpoint = getCropEndpoint(normalizedCropType);
        if (cropEndpoint == null) {
            return createErrorResponse(normalizedCropType, "지원하지 않는 작물 타입입니다.");
        }

        int predictedIndex;
        double confidence;
        String message;
        String responseLabel;

        try {
            String aiServerUrl = buildPredictUrl(cropEndpoint);
            log.info("AI 서버 진단 요청: URL={}, cropType={}, userId={}", aiServerUrl, normalizedCropType, userId);

            HttpEntity<MultiValueMap<String, Object>> request = createRequest(image);
            ResponseEntity<String> response = restTemplate.postForEntity(aiServerUrl, request, String.class);

            log.info("AI 서버 응답 상태: {}", response.getStatusCode());
            log.debug("AI 서버 응답 본문: {}", response.getBody());

            if (response.getBody() == null || response.getBody().isBlank()) {
                return createErrorResponse(normalizedCropType, "AI 서버로부터 응답을 받지 못했습니다.");
            }

            JsonNode json = objectMapper.readTree(response.getBody());
            predictedIndex = json.path("predicted_index").asInt(-1);
            confidence = json.path("confidence").asDouble(0.0);
            message = json.path("message").asText("");
            responseLabel = json.path("label").asText("");

            if (message.isBlank()) message = "분석이 완료되었습니다.";

            if (predictedIndex < 0) {
                return createErrorResponse(normalizedCropType, message);
            }

        } catch (Exception e) {
            log.error("AI 서버 오류: {}", e.getMessage());
            return createErrorResponse(normalizedCropType, "AI 서버 연결 실패: " + e.getMessage());
        }

        String label = getCanonicalLabel(normalizedCropType, predictedIndex);
        if (!StringUtils.hasText(label)) label = responseLabel;

        String careComment = getCareComment(normalizedCropType, label);

        String photoUrl = "";
        try {
            photoUrl = objectStorageService.uploadDiagnosisImage(image, userId);
        } catch (Exception e) {
            log.error("이미지 업로드 실패", e);
        }

        Long diagnosisId = saveDiagnosis(userId, normalizedCropType, label, careComment, photoUrl);

        return new AiDiagnosisResponse(true, normalizedCropType, label, predictedIndex, confidence, message, careComment, diagnosisId);
    }


    private String getCropEndpoint(String cropType) {
        return switch (cropType) {
            case "apple" -> "apple";
            case "tomato" -> "tomato";
            default -> null;
        };
    }

    private String buildPredictUrl(String cropEndpoint) {
        String base = aiServerBaseUrl == null ? "" : aiServerBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/predict/" + cropEndpoint;
    }

    private String getCanonicalLabel(String cropType, int index) {
        if ("tomato".equals(cropType)) {
            return switch (index) {
                case 0, 1, 2, 3 -> "Tomato___Early_blight";
                case 4, 5, 6 -> "Tomato___Spider_mites Two-spotted_spider_mite";
                case 7, 8, 9 -> "Tomato___Tomato_Yellow_Leaf_Curl_Virus";
                default -> "";
            };
        }

        String[] labels = getLabels(cropType);
        return (index >= 0 && index < labels.length) ? labels[index] : "";
    }

    private String[] getLabels(String cropType) {
        return switch (cropType) {
            case "apple" -> new String[]{
                    "Apple___Powdery_mildew",
                    "Apple___Rust",
                    "Apple___Scab"
            };
            case "tomato" -> new String[]{
                    "Tomato___Early_blight",
                    "Tomato___Spider_mites Two-spotted_spider_mite",
                    "Tomato___Tomato_Yellow_Leaf_Curl_Virus"
            };
            default -> new String[0];
        };
    }

    private String getCareComment(String cropType, String label) {
        String fallback = DEFAULT_CARE_TIPS.getOrDefault(cropType, GENERIC_CARE_TIP);
        if (!StringUtils.hasText(label)) return fallback;

        String normalizedLabel = normalizeLabel(label);
        List<String> searchTargets = List.of(normalizedLabel, normalizeLabel(cropType + " " + label));

        for (String candidate : searchTargets) {
            for (Map.Entry<String, String> entry : CARE_COMMENT_RULES) {
                if (candidate.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }

        return fallback;
    }

    private String normalizeLabel(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
                .replace("___", " ")
                .replace("__", " ")
                .replace("_", " ")
                .replace("-", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private Long saveDiagnosis(Long userId, String cropName, String diseaseName, String recommendation, String photoUrl) {
        Diagnosis diagnosis = Diagnosis.builder()
                .userId(userId)
                .cropName(cropName)
                .photoUrl(photoUrl)
                .diseaseName(diseaseName)
                .recommendation(recommendation)
                .build();

        return diagnosisRepository.save(diagnosis).getDiagnosisId();
    }

    private AiDiagnosisResponse createErrorResponse(String cropType, String message) {
        return new AiDiagnosisResponse(false, cropType, "", -1, 0.0, message, "", null);
    }

    /**
     * 사용자의 진단 내역 목록 조회
     * @param userId 사용자 ID
     * @return 진단 내역 목록 (최신순)
     */
    public List<Diagnosis> getDiagnosisHistory(Long userId) {
        return diagnosisRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
