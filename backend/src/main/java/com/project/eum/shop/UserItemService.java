package com.project.eum.shop;

import com.project.eum.dto.UserInventoryResponse;
import com.project.eum.dto.UserItemEquipResponse;
import com.project.eum.dto.UserItemPurchaseResponse;
import com.project.eum.dto.UserItemSummaryResponse;
import com.project.eum.service.CoinService;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * 사용자 아이템(보유/장착) 처리 서비스.
 */
@Service
@RequiredArgsConstructor
public class UserItemService {

    private final UserItemRepository userItemRepository;
    private final ShopItemRepository shopItemRepository;
    private final MemberRepository memberRepository;
    private final CoinService coinService;

    @Transactional(readOnly = true)
    public UserInventoryResponse getInventory(Long memberId) {
        List<UserItemSummaryResponse> items = userItemRepository.findByUserUserId(memberId).stream()
                .map(this::toSummary)
                .toList();
        return new UserInventoryResponse(items);
    }

    @Transactional
    public UserItemPurchaseResponse purchaseItem(Long memberId, Long itemId) {
        if (memberId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (itemId == null) {
            throw new IllegalArgumentException("구매할 아이템을 선택해 주세요.");
        }
        ShopItem shopItem = shopItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상점 아이템입니다."));

        Optional<UserItem> existing = userItemRepository.findByUserUserIdAndShopItem_Id(memberId, itemId);
        if (existing.isPresent()) {
            long balance = coinService.getBalance(memberId);
            return new UserItemPurchaseResponse(balance, toSummary(existing.get()));
        }

        long price = shopItem.getItemPrice() != null ? shopItem.getItemPrice().longValue() : 0L;
        long remainingBalance = price > 0 ? coinService.spendCoins(memberId, price) : coinService.getBalance(memberId);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        UserItem entity = UserItem.builder()
                .user(member)
                .shopItem(shopItem)
                .itemCategory(normalizeCategory(shopItem.getItemCategory()))
                .status(UserItemStatus.UNEQUIPPED)
                .build();
        UserItem saved = userItemRepository.save(entity);
        return new UserItemPurchaseResponse(remainingBalance, toSummary(saved));
    }

    @Transactional
    public UserItemEquipResponse equipItem(Long memberId, Long itemId) {
        if (memberId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (itemId == null) {
            throw new IllegalArgumentException("장착할 아이템을 선택해 주세요.");
        }
        UserItem item = userItemRepository.findByUserUserIdAndShopItem_Id(memberId, itemId)
                .orElseThrow(() -> new IllegalArgumentException("해당 아이템을 보유하고 있지 않습니다."));

        String category = defaultCategory(item.getItemCategory());
        userItemRepository.unequipCategory(memberId, category);
        item.setStatus(UserItemStatus.EQUIPPED);
        userItemRepository.save(item);

        return new UserItemEquipResponse(item.getShopItem().getId(), category, item.getStatus());
    }

    private UserItemSummaryResponse toSummary(UserItem entity) {
        return new UserItemSummaryResponse(
                entity.getId(),
                entity.getShopItem().getId(),
                defaultCategory(entity.getItemCategory()),
                entity.getStatus(),
                entity.getAcquiredAt()
        );
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "tool";
        }
        return category.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultCategory(String category) {
        return normalizeCategory(category);
    }
}
