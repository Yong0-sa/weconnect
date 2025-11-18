package com.project.eum.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Naver Cloud Platform Object Storage 업로드 서비스
 * AWS S3 호환 API 사용
 */
@Slf4j
@Service
public class ObjectStorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String endpoint;

    
    /* ============================================================
       생성자 — Object Storage 연결 설정
       ============================================================ */
    public ObjectStorageService(
            @Value("${cloud.ncp.object-storage.endpoint}") String endpoint,
            @Value("${cloud.ncp.object-storage.region}") String region,
            @Value("${cloud.ncp.object-storage.access-key}") String accessKey,
            @Value("${cloud.ncp.object-storage.secret-key}") String secretKey,
            @Value("${cloud.ncp.object-storage.bucket-name}") String bucketName
    ) {
        this.endpoint = endpoint;
        this.bucketName = bucketName;

        // 1) 인증 정보 생성
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        // 2) S3Client 생성 (NCP Object Storage compatible)
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

        log.info("ObjectStorageService 초기화: endpoint={}, bucket={}", endpoint, bucketName);
    }

    /**
     * 작물 진단 이미지를 Object Storage에 업로드
     */
    public String uploadDiagnosisImage(MultipartFile file, Long userId) {
        return uploadImage(file, userId, "diagnosis");
    }

    /**
     * 재배 일기 이미지를 Object Storage에 업로드
     */
    public String uploadDiaryImage(MultipartFile file, Long userId) {
        return uploadImage(file, userId, "diary");
    }

    private String uploadImage(MultipartFile file, Long userId, String category) {
        try {
            // 파일명 생성: {category}/{userId}/{timestamp}_{uuid}_{originalFilename}
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String uuid = UUID.randomUUID().toString().substring(0, 8);
            String originalFilename = file.getOriginalFilename();
            String filename = String.format("%s/%d/%s_%s_%s", category, userId, timestamp, uuid, originalFilename);

            log.info("Object Storage 업로드 시작: bucket={}, key={}, size={}", bucketName, filename, file.getSize());

            // S3 업로드 요청
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(filename)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            // 실제 업로드 실행
            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // 업로드된 파일의 공개 URL 생성
            String publicUrl = String.format("%s/%s/%s", endpoint, bucketName, filename);
            log.info("Object Storage 업로드 완료: url={}", publicUrl);

            return publicUrl;

        // 예외 처리
        } catch (IOException e) {
            log.error("Object Storage 업로드 실패: 파일 읽기 오류", e);
            throw new RuntimeException("이미지 업로드 중 오류가 발생했습니다: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Object Storage 업로드 실패", e);
            throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage(), e);
        }
    }
}
