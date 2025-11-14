package com.project.eum.ai.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;

/**
 * 문자열 리스트(List<String>)를
 * DB의 JSON 문자열로 저장·조회할 때 자동 변환해주는 컨버터.
 */

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    // JSON 변환용 ObjectMapper
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    // JSON → List<String> 변환 시 타입 정보를 담기 위한 TypeReference
    private static final TypeReference<List<String>> TYPE = new TypeReference<>() {};

    // 엔티티의 List<String> → DB에 저장할 JSON 문자열로 변환
    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        // null 또는 빈 리스트면 빈 JSON 배열로 저장
        if (attribute == null || attribute.isEmpty()) {
            return "[]";
        }

        try {
            // 리스트를 JSON 문자열로 직렬화
            return OBJECT_MAPPER.writeValueAsString(attribute);
        
        } catch (JsonProcessingException ex) {
            // 직렬화 실패 시 예외 발생
            throw new IllegalStateException("Failed to serialize list to JSON", ex);
        }
    }

    // DB의 JSON 문자열 → 엔티티의 List<String> 형태로 변환
    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        // null 또는 빈 문자열이면 빈 리스트 반환
        if (dbData == null || dbData.isBlank()) {
            return Collections.emptyList();
        }

        try {
            // JSON 문자열을 List<String>으로 역직렬화
            return OBJECT_MAPPER.readValue(dbData, TYPE);
        
        } catch (Exception ex) {
            // 역직렬화 실패 시 예외 발생
            throw new IllegalStateException("Failed to deserialize JSON to list", ex);
        }
    }
}

