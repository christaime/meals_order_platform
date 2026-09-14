package com.mealmarket.meal.domain.repository;

import com.mealmarket.meal.domain.model.Customer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository {
  Customer save(Customer customer);

  Optional<Customer> findById(UUID id);

  Optional<Customer> findByEmail(String email);

  Optional<Customer> findByUserId(UUID userId);

  List<Customer> findAllByIsActive(Boolean isActive);

  List<Customer> searchCustomers(String query);
}
