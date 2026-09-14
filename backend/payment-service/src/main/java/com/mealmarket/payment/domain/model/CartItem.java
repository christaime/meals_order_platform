package com.mealmarket.payment.domain.model;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CartItem {
  private Long id;
  private Long mealId;
  private String mealName;
  private BigDecimal price;
  private int quantity;
}
