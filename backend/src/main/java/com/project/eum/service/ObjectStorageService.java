package com.project.eum.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
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
    private final String cdnDomain;


    /* ============================================================
       생성자 — Object Storage 연결 설정
       ============================================================ */
    public ObjectStorageService(
            @Value("${cloud.ncp.object-storage.endpoint}") String endpoint,
            @Value("${cloud.ncp.object-storage.region}") String region,
            @Value("${cloud.ncp.object-storage.access-key}") String accessKey,
            @Value("${cloud.ncp.object-storage.secret-key}") String secretKey,
            @Value("${cloud.ncp.object-storage.bucket-name}") String bucketName,
            @Value("${CDN_DOMAIN:}") String cdnDomain
    ) {
        this.endpoint = endpoint;
        this.bucketName = bucketName;
        this.cdnDomain = cdnDomain;

        // 1) 인증 정보 생성
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        // 2) S3Client 생성 (NCP Object Storage compatible)
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

        log.info("ObjectStorageService 초기화: endpoint={}, bucket={}, cdnDomain={}", endpoint, bucketName, cdnDomain);
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

    /**
     * 커뮤니티 게시글 이미지를 Object Storage에 업로드
     */
    public String uploadCommunityImage(MultipartFile file, Long userId) {
        return uploadImage(file, userId, "community");
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
                    .acl("public-read")
                    .build();

            // 실제 업로드 실행
            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // 경로만 반환 (DB에 저장용)
            log.info("Object Storage 업로드 완료: path={}", filename);
            return filename;

        // 예외 처리
        } catch (IOException e) {
            log.error("Object Storage 업로드 실패: 파일 읽기 오류", e);
            throw new RuntimeException("이미지 업로드 중 오류가 발생했습니다: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Object Storage 업로드 실패", e);
            throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 저장된 경로를 공개 URL로 변환
     * CDN 도메인이 설정되어 있으면 CDN URL, 없으면 Object Storage URL 반환
     */
    public String buildPublicUrl(String path) {
        if (!StringUtils.hasText(path)) {
            return null;
        }

        if (StringUtils.hasText(cdnDomain)) {
            // CDN 도메인이 설정되어 있으면 CDN URL 반환
            String cleanCdnDomain = cdnDomain.trim();
            if (!cleanCdnDomain.startsWith("http://") && !cleanCdnDomain.startsWith("https://")) {
                cleanCdnDomain = "https://" + cleanCdnDomain;
            }
            return String.format("%s/%s", cleanCdnDomain, path);
        } else {
            // CDN 도메인이 없으면 Object Storage URL 반환
            return String.format("%s/%s/%s", endpoint, bucketName, path);
        }
    }

    /**
     * URL 또는 경로에서 Object 삭제
     */
    public void deleteObjectByUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return;
        }

        // URL이 전체 URL인지 경로만인지 확인
        String key;
        if (url.startsWith("http://") || url.startsWith("https://")) {
            // 전체 URL인 경우 경로 추출
            String prefix = endpoint.endsWith("/")
                    ? endpoint + bucketName + "/"
                    : endpoint + "/" + bucketName + "/";
            if (url.startsWith(prefix)) {
                key = url.substring(prefix.length());
            } else {
                // CDN URL일 수 있으므로 마지막 / 이후부터 찾기
                int lastSlashIndex = url.indexOf('/', 8); // https:// 이후 첫 /
                if (lastSlashIndex > 0) {
                    key = url.substring(lastSlashIndex + 1);
                } else {
                    log.warn("Cannot extract key from URL: {}", url);
                    return;
                }
            }
        } else {
            // 경로만 있는 경우
            key = url;
        }

        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("Deleted object from storage: {}", key);
        } catch (Exception e) {
            log.error("Failed to delete object {}: {}", key, e.getMessage());
        }
    }
}
