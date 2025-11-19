package com.project.eum.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * user_items 테이블 접근 전용 Repository.
 */
public interface UserItemRepository extends JpaRepository<UserItem, Long> {

    List<UserItem> findByUserUserId(Long userId);

    Optional<UserItem> findByUserUserIdAndShopItem_Id(Long userId, Long itemId);

    @Modifying(clearAutomatically = true)
    @Query("""
            update UserItem ui
               set ui.status = com.project.eum.shop.UserItemStatus.UNEQUIPPED
             where ui.user.userId = :userId
               and ui.itemCategory = :category
               and ui.status = com.project.eum.shop.UserItemStatus.EQUIPPED
            """)
    int unequipCategory(@Param("userId") Long userId, @Param("category") String category);
}
