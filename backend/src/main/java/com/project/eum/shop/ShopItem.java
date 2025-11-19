package com.project.eum.shop;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 상점에서 판매되는 원시 아이템 정보 (DB shop_items 테이블과 매핑).
 */
@Entity
@Table(name = "shop_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long id;

    @Column(name = "item_name", nullable = false, length = 100)
    private String itemName;

    @Column(name = "item_price")
    private Integer itemPrice;

    @Column(name = "item_info", length = 255)
    private String itemInfo;

    @Column(name = "photo_url", length = 255)
    private String photoUrl;

    @Column(name = "item_category", length = 50)
    private String itemCategory;
}
