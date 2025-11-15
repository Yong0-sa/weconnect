package com.project.eum.ai.service;

/**
 * AI 서버 호출 중 발생하는 예외를 표현하는 커스텀 예외 클래스.
 * - RestTemplate 통신 오류
 * - 응답 형식 불일치
 * - 내부 AI 서버 오류 등
 * 이런 상황에서 명확한 예외 타입으로 구분하기 위해 사용한다.
 */
public class AiServerException extends RuntimeException {
    // 메시지만 전달하는 생성자
    public AiServerException(String message) {
        super(message);
    }

    // 메시지와 원인 예외를 함께 전달하는 생성자
    public AiServerException(String message, Throwable cause) {
        super(message, cause);
    }
}

