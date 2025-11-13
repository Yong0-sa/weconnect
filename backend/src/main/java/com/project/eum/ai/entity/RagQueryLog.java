package com.project.eum.ai.entity;

import com.project.eum.ai.converter.StringListJsonConverter;
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

@Getter
@Setter
@Entity
@Table(name = "rag_query_logs")
public class RagQueryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Member user;

    @Column(name = "query_text", nullable = false, columnDefinition = "TEXT")
    private String queryText;

    @Enumerated(EnumType.STRING)
    @Column(name = "prompt_type", nullable = false, length = 20)
    private PromptType promptType = PromptType.ANSWER;

    @Column(name = "answer", columnDefinition = "MEDIUMTEXT")
    private String answer;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "pdf_links", columnDefinition = "JSON")
    private List<String> pdfLinks = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "embed_ids", columnDefinition = "JSON")
    private List<String> embedIds = new ArrayList<>();

    @Column(name = "top_k", nullable = false)
    private Integer topK = 5;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

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
