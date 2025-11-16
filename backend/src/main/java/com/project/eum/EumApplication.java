package com.project.eum;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


/**
 * 애플리케이션 진입점.
 * - Spring Boot 자동 설정 활성화
 * - 서버 실행 및 전체 Bean 초기화 시작
 */
@SpringBootApplication
public class EumApplication {

	public static void main(String[] args) {

		// Spring Boot 애플리케이션 실행
		SpringApplication.run(EumApplication.class, args);
	}

}
