package com.project.eum.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * shop_items 테이블 CRUD 전담 JPA 레포지토리.
 */
@Repository
public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
}
