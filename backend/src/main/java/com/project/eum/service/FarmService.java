package com.project.eum.service;

import com.project.eum.dto.CreateFarmRequest;
import com.project.eum.dto.FarmResponse;
import com.project.eum.farm.Farm;
import com.project.eum.farm.FarmRepository;
import com.project.eum.service.dto.GeoCoordinate;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FarmService {

    private static final BigDecimal DEFAULT_COORDINATE = BigDecimal.ZERO.setScale(8, RoundingMode.HALF_UP);

    private final MemberRepository memberRepository;
    private final FarmRepository farmRepository;
    private final KakaoAddressSearchClient kakaoAddressSearchClient;

    @Transactional
    public Farm registerFarm(Long ownerId, CreateFarmRequest request) {
        Member owner = memberRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("농장주 정보를 찾을 수 없습니다."));

        if (!isFarmOwner(owner)) {
            throw new IllegalStateException("농장주만 농장을 등록할 수 있습니다.");
        }

        if (owner.getFarm() != null || farmRepository.existsByOwnerUserId(ownerId)) {
            throw new IllegalStateException("이미 등록된 농장이 있습니다.");
        }

        CoordinatePair coordinates = resolveCoordinates(request);

        Farm farm = Farm.builder()
                .owner(owner)
                .name(request.name().trim())
                .city(resolveCity(request))
                .address(request.address().trim())
                .tel(resolveTel(request.tel()))
                .latitude(coordinates.latitude())
                .longitude(coordinates.longitude())
                .build();

        Farm saved = farmRepository.save(farm);
        owner.setFarm(saved);
        memberRepository.save(owner);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<FarmResponse> getAllFarms() {
        return farmRepository.findAll().stream()
                .map(FarmResponse::from)
                .collect(Collectors.toList());
    }

    private boolean isFarmOwner(Member owner) {
        if (owner.getRole() == null) {
            return false;
        }
        return owner.getRole() == UserRole.FARMER || owner.getRole() == UserRole.ADMIN;
    }

    private String resolveCity(CreateFarmRequest request) {
        if (StringUtils.hasText(request.city())) {
            return truncate(request.city().trim(), 100);
        }
        String address = request.address();
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

    private String resolveTel(String tel) {
        if (!StringUtils.hasText(tel)) {
            return null;
        }
        return truncate(tel.trim(), 20);
    }

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

    private CoordinatePair resolveCoordinates(CreateFarmRequest request) {
        if (request.latitude() != null && request.longitude() != null) {
            return new CoordinatePair(
                    resolveCoordinate(request.latitude()),
                    resolveCoordinate(request.longitude())
            );
        }

        return kakaoAddressSearchClient.findCoordinatesByAddress(request.address())
                .map(this::convertCoordinate)
                .orElseGet(() -> new CoordinatePair(DEFAULT_COORDINATE, DEFAULT_COORDINATE));
    }

    private CoordinatePair convertCoordinate(GeoCoordinate coordinate) {
        return new CoordinatePair(
                resolveCoordinate(coordinate.latitude()),
                resolveCoordinate(coordinate.longitude())
        );
    }

    private String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private record CoordinatePair(BigDecimal latitude, BigDecimal longitude) {
    }
}
