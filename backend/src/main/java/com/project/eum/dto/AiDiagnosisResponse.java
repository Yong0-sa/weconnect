package com.project.eum.dto;

/**
 * AI 작물 진단 결과를 담는 간단한 DTO 클래스.
 */
public class AiDiagnosisResponse {

    // AI 진단 수행 성공 여부
    private boolean success;
    
    // 입력 이미지의 작물 종류
    private String cropType;

    // 예측된 병해충 이름
    private String label;

    // 모델이 예측한 클래스 인덱스
    private int predictedIndex;

    // 모델 신뢰도(0.0 ~ 1.0)
    private double confidence;

    // 사용자에게 보여줄 메시지
    private String message;

    // 병해충 관리 팁
    private String careComment;

    // 진단 결과 ID (재배일기 공유용)
    private Long diagnosisId;  

    public AiDiagnosisResponse() {
    }

    public AiDiagnosisResponse(
            boolean success,
            String cropType,
            String label,
            int predictedIndex,
            double confidence,
            String message,
            String careComment
    ) {
        this.success = success;
        this.cropType = cropType;
        this.label = label;
        this.predictedIndex = predictedIndex;
        this.confidence = confidence;
        this.message = message;
        this.careComment = careComment;
    }

    public AiDiagnosisResponse(
            boolean success,
            String cropType,
            String label,
            int predictedIndex,
            double confidence,
            String message,
            String careComment,
            Long diagnosisId
    ) {
        this.success = success;
        this.cropType = cropType;
        this.label = label;
        this.predictedIndex = predictedIndex;
        this.confidence = confidence;
        this.message = message;
        this.careComment = careComment;
        this.diagnosisId = diagnosisId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public int getPredictedIndex() {
        return predictedIndex;
    }

    public void setPredictedIndex(int predictedIndex) {
        this.predictedIndex = predictedIndex;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getCareComment() {
        return careComment;
    }

    public void setCareComment(String careComment) {
        this.careComment = careComment;
    }

    public Long getDiagnosisId() {
        return diagnosisId;
    }

    public void setDiagnosisId(Long diagnosisId) {
        this.diagnosisId = diagnosisId;
    }
}

