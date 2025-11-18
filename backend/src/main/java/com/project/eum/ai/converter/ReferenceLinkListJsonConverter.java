package com.project.eum.ai.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.eum.ai.model.ReferenceLink;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * ReferenceLink 리스트를 JSON 문자열로 직렬화/역직렬화하는 컨버터.
 * 이전 데이터(문자열 배열)도 역호환되도록 처리한다.
 */
@Converter
public class ReferenceLinkListJsonConverter implements AttributeConverter<List<ReferenceLink>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<ReferenceLink> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "[]";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize reference links to JSON", ex);
        }
    }

    @Override
    public List<ReferenceLink> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return Collections.emptyList();
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(dbData);
            if (!root.isArray()) {
                return Collections.emptyList();
            }
            List<ReferenceLink> links = new ArrayList<>();
            for (JsonNode node : root) {
                ReferenceLink link = parseNode(node);
                if (link != null) {
                    links.add(link);
                }
            }
            return links;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to deserialize JSON to reference links", ex);
        }
    }

    private ReferenceLink parseNode(JsonNode node) {
        if (node.isObject()) {
            String title = node.path("title").asText("");
            String url = node.path("url").asText("");
            return ReferenceLink.of(title, url);
        }
        if (node.isTextual()) {
            String value = node.asText("");
            return ReferenceLink.of(value, value);
        }
        return null;
    }
}
