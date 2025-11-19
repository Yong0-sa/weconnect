package com.project.eum.service;

import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 코인 적립/차감 관련 비즈니스 로직 전담 서비스.
 */
@Service
@RequiredArgsConstructor
public class CoinService {

    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public long getBalance(Long memberId) {
        Member member = findMember(memberId);
        Long balance = member.getCoinBalance();
        return balance != null ? balance : 0L;
    }

    @Transactional
    public long addCoins(Long memberId, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("적립 코인은 1 이상이어야 합니다.");
        }
        Member member = findMember(memberId);
        long current = member.getCoinBalance() != null ? member.getCoinBalance() : 0L;
        long next = current + amount;
        member.setCoinBalance(next);
        return next;
    }

    @Transactional
    public long spendCoins(Long memberId, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("차감 코인은 1 이상이어야 합니다.");
        }
        Member member = findMember(memberId);
        long current = member.getCoinBalance() != null ? member.getCoinBalance() : 0L;
        if (current < amount) {
            throw new IllegalArgumentException("코인이 부족합니다.");
        }
        long next = current - amount;
        member.setCoinBalance(next);
        return next;
    }

    private Member findMember(Long memberId) {
        if (memberId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
    }
}
