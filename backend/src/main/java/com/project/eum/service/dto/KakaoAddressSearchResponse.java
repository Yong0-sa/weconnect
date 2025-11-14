package com.project.eum.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoAddressSearchResponse(
        List<Document> documents
) {

    public Optional<GeoCoordinate> firstCoordinate() {
        if (CollectionUtils.isEmpty(documents)) {
            return Optional.empty();
        }
        return documents.stream()
                .map(Document::toCoordinate)
                .flatMap(Optional::stream)
                .findFirst();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Document(
            @JsonProperty("x")
            String longitude,

            @JsonProperty("y")
            String latitude
    ) {
        public Optional<GeoCoordinate> toCoordinate() {
            if (!StringUtils.hasText(latitude) || !StringUtils.hasText(longitude)) {
                return Optional.empty();
            }
            try {
                return Optional.of(new GeoCoordinate(
                        new BigDecimal(latitude),
                        new BigDecimal(longitude)
                ));
            } catch (NumberFormatException ex) {
                return Optional.empty();
            }
        }
    }
}
