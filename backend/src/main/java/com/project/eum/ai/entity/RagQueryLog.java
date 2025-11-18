package com.project.eum.ai.entity;

import com.project.eum.ai.converter.ReferenceLinkListJsonConverter;
import com.project.eum.ai.converter.StringListJsonConverter;
import com.project.eum.ai.model.ReferenceLink;
import com.project.eum.user.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AI 질문/응답 로그를 저장하는 엔티티.
 * - 사용자 질문, AI 답변, 프롬프트 타입, topK 값, 참고된 PDF 링크 등을 기록.
 * - rag_query_logs 테이블과 매핑됨.
 */

@Getter
@Setter
@Entity
@Table(name = "rag_query_logs")
public class RagQueryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 로그를 남긴 사용자 (FK: user_id)
     * - Member 엔티티와 다대일 관계
     * - LAZY 로딩
     * - 사용자 삭제 시 해당 로그도 모두 삭제 (ON DELETE CASCADE)
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Member user;

    // 사용자가 AI에게 입력한 질문 내용.
    @Column(name = "query_text", nullable = false, columnDefinition = "TEXT")
    private String queryText;

    // AI가 어떤 프롬프트로 응답했는지 나타내는 Enum.
    @Enumerated(EnumType.STRING)
    @Column(name = "prompt_type", nullable = false, length = 20)
    private PromptType promptType = PromptType.ANSWER;

    // AI가 사용자 질문에 대해 응답한 답변 내용.
    @Column(name = "answer", columnDefinition = "MEDIUMTEXT")
    private String answer;

    // 참고된 PDF 링크들의 리스트를 JSON 문자열로 저장.
    @Convert(converter = ReferenceLinkListJsonConverter.class)
    @Column(name = "pdf_links", columnDefinition = "JSON")
    private List<ReferenceLink> pdfLinks = new ArrayList<>();

    // 참고된 임베딩 ID들의 리스트를 JSON 문자열로 저장.
    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "embed_ids", columnDefinition = "JSON")
    private List<String> embedIds = new ArrayList<>();

    // 검색된 상위 K개 문서 수 (기본값 5)
    @Column(name = "top_k", nullable = false)
    private Integer topK = 5;

    // 로그 생성 시각. INSERT 시 자동 기록
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 엔티티가 처음 저장되기 전에 호출되어 기본값을 설정.
    @PrePersist
    public void prePersist() {
        if (topK == null || topK <= 0) {
            topK = 5;
        }
        if (pdfLinks == null) {
            pdfLinks = new ArrayList<>();
        }
        if (embedIds == null) {
            embedIds = new ArrayList<>();
        }
    }
}
