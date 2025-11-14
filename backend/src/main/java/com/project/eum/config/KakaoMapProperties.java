package com.project.eum.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kakao.map")
public class KakaoMapProperties {

    /**
     * Kakao Local API 주소 검색 엔드포인트.
     */
    private String addressSearchUrl = "https://dapi.kakao.com/v2/local/search/address.json";

    /**
     * Kakao REST API 키.
     */
    private String restApiKey;

    public String getAddressSearchUrl() {
        return addressSearchUrl;
    }

    public void setAddressSearchUrl(String addressSearchUrl) {
        this.addressSearchUrl = addressSearchUrl;
    }

    public String getRestApiKey() {
        return restApiKey;
    }

    public void setRestApiKey(String restApiKey) {
        this.restApiKey = restApiKey;
    }
}
