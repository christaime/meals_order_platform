package com.mealmarket.payment.infrastructure.web;

import com.mealmarket.payment.application.dto.AddItemRequest;
import com.mealmarket.payment.application.dto.CartDto;
import com.mealmarket.payment.application.dto.CartItemDto;
import com.mealmarket.payment.domain.model.CartItem;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/carts")
public class CartController {

  private final List<CartItem> memoryCart = new ArrayList<>();

  @GetMapping("/{customerId}")
  public ResponseEntity<CartDto> getCart(@PathVariable Long customerId) {
    List<CartItemDto> itemDtos =
        memoryCart.stream()
            .map(
                i ->
                    new CartItemDto(
                        i.getId(),
                        i.getMealId(),
                        i.getMealName(),
                        i.getPrice(),
                        i.getQuantity(),
                        i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity()))))
            .toList();

    BigDecimal total =
        itemDtos.stream().map(CartItemDto::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);

    return ResponseEntity.ok(new CartDto(1L, customerId, itemDtos, total));
  }

  @PostMapping("/{customerId}/items")
  public ResponseEntity<CartDto> addItem(
      @PathVariable Long customerId, @Valid @RequestBody AddItemRequest request) {
    memoryCart.add(
        new CartItem(
            (long) (memoryCart.size() + 1),
            request.mealId(),
            request.mealName(),
            request.price(),
            request.quantity()));
    return getCart(customerId);
  }
}
