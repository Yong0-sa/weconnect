package com.project.eum.service;

import com.project.eum.dto.FarmContractApplyRequest;
import com.project.eum.dto.FarmContractResponse;
import com.project.eum.dto.FarmContractStatusUpdateRequest;
import com.project.eum.farm.Farm;
import com.project.eum.farm.FarmRepository;
import com.project.eum.farm.contract.FarmContract;
import com.project.eum.farm.contract.FarmContractRepository;
import com.project.eum.farm.contract.FarmContractStatus;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import com.project.eum.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FarmContractService {

    private final FarmContractRepository farmContractRepository;
    private final FarmRepository farmRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public FarmContractResponse apply(Long userId, FarmContractApplyRequest request) {
        expireFinishedContracts();
        if (request == null || request.farmId() == null) {
            throw new IllegalArgumentException("농장을 선택해 주세요.");
        }

        Member applicant = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
        if (applicant.getFarm() != null) {
            throw new IllegalStateException("이미 농장에 소속되어 있습니다.");
        }

        Farm farm = farmRepository.findById(request.farmId())
                .orElseThrow(() -> new IllegalArgumentException("농장 정보를 찾을 수 없습니다."));
        if (farm.getOwner().getUserId().equals(userId)) {
            throw new IllegalStateException("내 농장에는 신청할 수 없습니다.");
        }

        if (farmContractRepository.existsByFarmFarmIdAndUserUserId(farm.getFarmId(), userId)) {
            throw new IllegalStateException("이미 신청 내역이 있습니다.");
        }

        FarmContract saved = farmContractRepository.save(
                FarmContract.builder()
                        .farm(farm)
                        .user(applicant)
                        .status(FarmContractStatus.PENDING)
                        .build()
        );

        return FarmContractResponse.from(saved);
    }

    @Transactional
    public List<FarmContractResponse> getContractsForOwner(Long ownerId) {
        expireFinishedContracts();

        Member owner = memberRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("농장주 정보를 찾을 수 없습니다."));
        if (owner.getRole() != UserRole.FARMER && owner.getRole() != UserRole.ADMIN) {
            throw new IllegalStateException("농장주만 확인할 수 있습니다.");
        }
        if (!farmRepository.existsByOwnerUserId(ownerId)) {
            throw new IllegalStateException("등록된 농장이 없습니다.");
        }

        return farmContractRepository.findByFarmOwnerUserId(ownerId).stream()
                .map(FarmContractResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public FarmContractResponse updateStatus(
            Long ownerId,
            Long contractId,
            FarmContractStatusUpdateRequest request
    ) {
        expireFinishedContracts();
        if (request == null || !StringUtils.hasText(request.status())) {
            throw new IllegalArgumentException("상태를 입력해 주세요.");
        }
        FarmContract contract = farmContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("계약 정보를 찾을 수 없습니다."));

        if (!contract.getFarm().getOwner().getUserId().equals(ownerId)) {
            throw new IllegalStateException("해당 농장 계약을 승인할 권한이 없습니다.");
        }

        FarmContractStatus status = parseStatus(request.status());
        contract.setStatus(status);
        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract.setMemo(request.memo());
        contract.setDecidedAt(status == FarmContractStatus.PENDING ? null : LocalDateTime.now());

        if (status == FarmContractStatus.APPROVED) {
            Member applicant = contract.getUser();
            if (applicant.getFarm() != null && !applicant.getFarm().getFarmId().equals(contract.getFarm().getFarmId())) {
                throw new IllegalStateException("이미 다른 농장에 속한 회원입니다.");
            }
            applicant.setFarm(contract.getFarm());
            memberRepository.save(applicant);
        }

        return FarmContractResponse.from(contract);
    }

    @Transactional
    public void deleteContract(Long ownerId, Long contractId) {
        expireFinishedContracts();
        FarmContract contract = farmContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("계약 정보를 찾을 수 없습니다."));
        if (!contract.getFarm().getOwner().getUserId().equals(ownerId)) {
            throw new IllegalStateException("해당 농장 계약을 삭제할 권한이 없습니다.");
        }

        if (contract.getStatus() == FarmContractStatus.APPROVED) {
            Member applicant = contract.getUser();
            if (applicant.getFarm() != null &&
                    applicant.getFarm().getFarmId().equals(contract.getFarm().getFarmId())) {
                applicant.setFarm(null);
                memberRepository.save(applicant);
            }
        }

        farmContractRepository.delete(contract);
    }

    private void expireFinishedContracts() {
        LocalDate today = LocalDate.now();
        List<FarmContract> candidates =
                farmContractRepository.findByStatusAndEndDateBefore(FarmContractStatus.APPROVED, today);
        if (candidates.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        candidates.forEach(contract -> {
            contract.setStatus(FarmContractStatus.EXPIRED);
            contract.setDecidedAt(now);
            Member applicant = contract.getUser();
            if (applicant.getFarm() != null &&
                    applicant.getFarm().getFarmId().equals(contract.getFarm().getFarmId())) {
                applicant.setFarm(null);
                memberRepository.save(applicant);
            }
        });
    }

    private FarmContractStatus parseStatus(String source) {
        try {
            return FarmContractStatus.valueOf(source.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("허용되지 않은 상태입니다.");
        }
    }
}
