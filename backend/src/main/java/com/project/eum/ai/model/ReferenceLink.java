package com.project.eum.ai.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.util.StringUtils;

/**
 * 참고 링크(title + url)를 표현하는 모델.
 * - title이 비어 있으면 url을 그대로 제목으로 사용한다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReferenceLink {

    private String title;
    private String url;

    public static ReferenceLink of(String title, String url) {
        String normalizedUrl = url == null ? "" : url.trim();
        if (!StringUtils.hasText(normalizedUrl)) {
            return null;
        }
        String normalizedTitle = title == null ? "" : title.trim();
        if (!StringUtils.hasText(normalizedTitle)) {
            normalizedTitle = normalizedUrl;
        }
        return new ReferenceLink(normalizedTitle, normalizedUrl);
    }
}
