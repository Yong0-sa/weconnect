package com.project.eum.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

/**
 * 채팅용 WebSocket(STOMP) 설정 파일.
 * - 프론트와 통신할 WebSocket 엔드포인트 정의
 * - 메시지 브로커(prefix) 설정
 */
@Configuration
@EnableWebSocketMessageBroker
public class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * 클라이언트(WebSocket)에서 접속하는 엔드포인트 설정.
     * /ws/chat 경로로 WebSocket 연결을 허용하고,
     * 세션 정보를 WebSocket 핸드셰이크에 포함시키기 위해 HttpSessionHandshakeInterceptor 사용.
     * 모든 Origin 허용, SockJS fallback 지원.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chat")
                .addInterceptors(new HttpSessionHandshakeInterceptor())
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    // STOMP 메시지 라우팅 설정
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");  // 서버로 보내는 메시지 prefix
        registry.enableSimpleBroker("/topic", "/queue");  // 클라이언트로 보내는 메시지 prefix
        registry.setUserDestinationPrefix("/user");  // 사용자별 메시지 prefix
    }
}
