package com.project.eum.service;

import com.project.eum.dto.CreateFarmRequest;
import com.project.eum.dto.FarmResponse;
import com.project.eum.farm.Farm;
import com.project.eum.farm.FarmRepository;
import com.project.eum.service.dto.GeoCoordinate;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.UserRole;
import com.project.eum.dto.UpdateFarmRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 농장 등록 및 조회 관련 비즈니스 로직.
 * - 농장주 검증
 * - 주소 기반 좌표 변환(Kakao API)
 * - 농장 저장 및 Member와 연동
 */
@Service
@RequiredArgsConstructor
public class FarmService {

    // 좌표가 없을 때 사용하는 기본값 (0.00000000)
    private static final BigDecimal DEFAULT_COORDINATE = BigDecimal.ZERO.setScale(8, RoundingMode.HALF_UP);

    private final MemberRepository memberRepository;
    private final FarmRepository farmRepository;
    private final KakaoAddressSearchClient kakaoAddressSearchClient;

    /**
     * 농장 등록.
     * 1. owner 검증 → 농장주/관리자만 가능
     * 2. 기존 농장 보유 여부 확인
     * 3. 좌표 직접 입력 or Kakao API 로 조회
     * 4. Farm 저장 후 Member에 연결
     */
    @Transactional
    public Farm registerFarm(Long ownerId, CreateFarmRequest request) {
        Member owner = memberRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("농장주 정보를 찾을 수 없습니다."));

        if (!isFarmOwner(owner)) {
            throw new IllegalStateException("농장주만 농장을 등록할 수 있습니다.");
        }

        // 이미 농장 보유한 경우 등록 불가
        if (owner.getFarm() != null || farmRepository.existsByOwnerUserId(ownerId)) {
            throw new IllegalStateException("이미 등록된 농장이 있습니다.");
        }

        // 좌표 결정 (직접 입력 우선, 없으면 카카오주소 검색)
        String sanitizedName = request.name().trim();
        String sanitizedAddress = request.address().trim();
        String sanitizedTel = resolveTel(request.tel());
        String sanitizedCity = resolveCity(request.city(), sanitizedAddress);

        CoordinatePair coordinates = resolveCoordinates(sanitizedAddress, request.latitude(), request.longitude());

        Farm farm = Farm.builder()
                .owner(owner)
                .name(sanitizedName)
                .city(sanitizedCity)
                .address(sanitizedAddress)
                .tel(sanitizedTel)
                .latitude(coordinates.latitude())
                .longitude(coordinates.longitude())
                .build();

        Farm saved = farmRepository.save(farm);

        // Member에 농장 정보 연결
        owner.setFarm(saved);
        memberRepository.save(owner);

        return saved;
    }

    /**
     * 전체 농장 조회.
     */
    @Transactional(readOnly = true)
    public List<FarmResponse> getAllFarms() {
        return farmRepository.findAll().stream()
                .map(FarmResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 내 농장 단건 조회.
     */
    @Transactional(readOnly = true)
    public FarmResponse getMyFarm(Long ownerId) {
        Member owner = memberRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("농장주 정보를 찾을 수 없습니다."));
        if (!isFarmOwner(owner)) {
            throw new IllegalStateException("농장주만 농장 정보를 조회할 수 있습니다.");
        }
        Farm farm = farmRepository.findByOwnerUserId(ownerId)
                .orElseThrow(() -> new IllegalStateException("등록된 농장이 없습니다."));
        return FarmResponse.from(farm);
    }

    /**
     * 내 농장 정보 수정.
     */
    @Transactional
    public Farm updateFarm(Long ownerId, UpdateFarmRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("농장 정보를 입력해 주세요.");
        }

        Member owner = memberRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("농장주 정보를 찾을 수 없습니다."));

        if (!isFarmOwner(owner)) {
            throw new IllegalStateException("농장주만 농장 정보를 수정할 수 있습니다.");
        }

        Farm farm = farmRepository.findByOwnerUserId(ownerId)
                .orElseThrow(() -> new IllegalStateException("등록된 농장이 없습니다."));

        if (!StringUtils.hasText(request.name())) {
            throw new IllegalArgumentException("농장 이름을 입력해 주세요.");
        }
        if (!StringUtils.hasText(request.address())) {
            throw new IllegalArgumentException("농장 주소를 입력해 주세요.");
        }
        if (!StringUtils.hasText(request.tel())) {
            throw new IllegalArgumentException("농장 전화번호를 입력해 주세요.");
        }

        String sanitizedName = request.name().trim();
        String sanitizedAddress = request.address().trim();
        String sanitizedTel = resolveTel(request.tel());
        String sanitizedCity = resolveCity(null, sanitizedAddress);
        CoordinatePair coordinates = resolveCoordinates(sanitizedAddress, null, null);

        farm.setName(sanitizedName);
        farm.setAddress(sanitizedAddress);
        farm.setTel(sanitizedTel);
        farm.setCity(sanitizedCity);
        farm.setLatitude(coordinates.latitude());
        farm.setLongitude(coordinates.longitude());

        return farm;
    }

    /**
     * 농장 등록 가능한 역할인지 확인(FARMER / ADMIN).
     */
    private boolean isFarmOwner(Member owner) {
        if (owner.getRole() == null) {
            return false;
        }
        return owner.getRole() == UserRole.FARMER || owner.getRole() == UserRole.ADMIN;
    }

    /**
     * 요청에 city가 없으면 주소에서 앞 1~2단어를 추출하여 시/도로 사용.
     */
    private String resolveCity(String requestedCity, String address) {
        if (StringUtils.hasText(requestedCity)) {
            return truncate(requestedCity.trim(), 100);
        }
        if (!StringUtils.hasText(address)) {
            return "미지정";
        }
        String[] tokens = address.trim().split("\\s+");
        if (tokens.length == 0) {
            return "미지정";
        }
        if (tokens.length == 1) {
            return truncate(tokens[0], 100);
        }
        return truncate(tokens[0] + " " + tokens[1], 100);
    }

    /**
     * 연락처 최대 길이 제한 처리.
     */
    private String resolveTel(String tel) {
        if (!StringUtils.hasText(tel)) {
            return null;
        }
        return truncate(tel.trim(), 20);
    }


    /**
     * Double → BigDecimal 변환 후 소수 8자리 고정.
     */
    private BigDecimal resolveCoordinate(Double value) {
        if (value == null) {
            return DEFAULT_COORDINATE;
        }
        return BigDecimal.valueOf(value).setScale(8, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveCoordinate(BigDecimal value) {
        if (value == null) {
            return DEFAULT_COORDINATE;
        }
        return value.setScale(8, RoundingMode.HALF_UP);
    }

    /**
     * 좌표 결정:
     * - 요청에 latitude/longitude 있으면 그대로 사용
     * - 없으면 카카오 API로 주소→좌표 변환
     */
    private CoordinatePair resolveCoordinates(String address, Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            return new CoordinatePair(
                    resolveCoordinate(latitude),
                    resolveCoordinate(longitude)
            );
        }

        if (!StringUtils.hasText(address)) {
            return new CoordinatePair(DEFAULT_COORDINATE, DEFAULT_COORDINATE);
        }

        return kakaoAddressSearchClient.findCoordinatesByAddress(address)
                .map(this::convertCoordinate)
                .orElseGet(() -> new CoordinatePair(DEFAULT_COORDINATE, DEFAULT_COORDINATE));
    }


    /**
     * Kakao API에서 받은 좌표 → 시스템 좌표 형식으로 변환.
     */
    private CoordinatePair convertCoordinate(GeoCoordinate coordinate) {
        return new CoordinatePair(
                resolveCoordinate(coordinate.latitude()),
                resolveCoordinate(coordinate.longitude())
        );
    }

    /**
     * 문자열 길이를 제한.
     */
    private String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    /**
     * 좌표값 묶음.
     */
    private record CoordinatePair(BigDecimal latitude, BigDecimal longitude) {
    }
}
