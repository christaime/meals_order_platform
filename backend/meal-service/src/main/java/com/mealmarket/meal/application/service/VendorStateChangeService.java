package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ForbiddenException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.meal.application.dto.VendorDashboardResponse;
import com.mealmarket.meal.application.dto.VendorResponse;
import com.mealmarket.meal.application.dto.VendorStateChangeResponse;
import com.mealmarket.meal.application.mapper.CategoryDtoMapper;          // NEW
import com.mealmarket.meal.application.mapper.LocationDtoMapper;          // NEW
import com.mealmarket.meal.application.mapper.VendorDtoMapper;
import com.mealmarket.meal.application.mapper.VendorStateChangeDtoMapper;
import com.mealmarket.meal.domain.model.Vendor;
import com.mealmarket.meal.domain.model.VendorState;
import com.mealmarket.meal.domain.model.VendorStateChange;
import com.mealmarket.meal.domain.repository.MealRepository;
import com.mealmarket.meal.domain.repository.VendorRepository;
import com.mealmarket.meal.domain.repository.VendorStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorStateChangeService {

    private final VendorRepository vendorRepository;
    private final VendorStatusHistoryRepository historyRepository;
    private final MealRepository mealRepository;
    private final VendorDtoMapper vendorDtoMapper;
    private final CategoryDtoMapper categoryDtoMapper;                    // NEW
    private final LocationDtoMapper locationDtoMapper;                    // NEW
    private final VendorStateChangeDtoMapper historyDtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  State Transitions
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public VendorResponse activateVendor(UUID vendorId, UUID adminId) {
        return transitionState(
                vendorId,
                VendorState.VendorStatus.ACTIVE,
                "Vendor activated by admin",
                adminId,
                VendorState.StateChangeType.ADMIN_ACTION
        );
    }

    @Transactional
    public VendorResponse suspendVendor(UUID vendorId, String reason, UUID adminId) {
        return transitionState(
                vendorId,
                VendorState.VendorStatus.SUSPENDED,
                reason,
                adminId,
                VendorState.StateChangeType.ADMIN_ACTION
        );
    }

    @Transactional
    public VendorResponse banVendor(UUID vendorId, String reason, UUID adminId) {
        return transitionState(
                vendorId,
                VendorState.VendorStatus.BANNED,
                reason,
                adminId,
                VendorState.StateChangeType.ADMIN_ACTION
        );
    }

    @Transactional
    public VendorResponse deactivateVendor(UUID vendorId, String reason, UUID adminId) {
        return transitionState(
                vendorId,
                VendorState.VendorStatus.INACTIVE,
                reason,
                adminId,
                VendorState.StateChangeType.ADMIN_ACTION
        );
    }

    @Transactional
    public VendorResponse deactivateOwnAccount(UUID vendorId, String reason, UUID userId) {
        Vendor existing = findVendorOrThrow(vendorId);

        if (!existing.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only deactivate your own account");
        }

        return transitionState(
                vendorId,
                VendorState.VendorStatus.INACTIVE,
                reason != null ? reason : "Vendor deactivated own account",
                vendorId,
                VendorState.StateChangeType.VENDOR_ACTION
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  History
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<VendorStateChangeResponse> getVendorHistory(UUID vendorId) {
        log.debug("Fetching state history for vendor: {}", vendorId);

        if (!vendorRepository.existsById(vendorId)) {
            throw new ResourceNotFoundException("Vendor not found: " + vendorId);
        }

        return historyRepository.findByVendorId(vendorId).stream()
                .map(historyDtoMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VendorStateChangeResponse getLatestState(UUID vendorId) {
        log.debug("Fetching latest state for vendor: {}", vendorId);

        return historyRepository.findLatestByVendorId(vendorId)
                .map(historyDtoMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No state history found for vendor: " + vendorId));
    }

    // ═══════════════════════════════════════════════════════════
    //  Dashboard
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public VendorDashboardResponse getVendorDashboard(UUID vendorId, UUID userId) {
        log.debug("Fetching dashboard for vendor: {}", vendorId);

        Vendor vendor = findVendorOrThrow(vendorId);

        if (!vendor.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only view your own dashboard");
        }

        long totalMeals = mealRepository.countByVendorId(vendorId);
        long availableMeals = mealRepository.countAvailableByVendorId(vendorId);

        List<VendorStateChange> history = historyRepository.findByVendorId(vendorId);
        long banCount = history.stream()
                .filter(h -> h.getToStatus() == VendorState.VendorStatus.BANNED)
                .count();
        long suspensionCount = history.stream()
                .filter(h -> h.getToStatus() == VendorState.VendorStatus.SUSPENDED)
                .count();

        return new VendorDashboardResponse(
                (int) totalMeals,
                0,
                0,
                (int) availableMeals,
                vendor.getRatingAvg() != null ? vendor.getRatingAvg().doubleValue() : 0.0,
                vendor.getTotalRatings() != null ? vendor.getTotalRatings() : 0,
                (int) (banCount + suspensionCount),
                (int) banCount,
                (int) suspensionCount,
                List.of(),
                List.of()
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private VendorResponse transitionState(
            UUID vendorId,
            VendorState.VendorStatus targetStatus,
            String reason,
            UUID changedBy,
            VendorState.StateChangeType changeType
    ) {
        Vendor existing = findVendorOrThrow(vendorId);
        VendorState currentState = existing.getState();
        VendorState.VendorStatus currentStatus = currentState != null
                ? currentState.status()
                : null;

        if (currentState != null && !currentState.canTransitionTo(targetStatus)) {
            throw new ConflictException(
                    String.format("Cannot transition vendor from %s to %s",
                            currentStatus, targetStatus)
            );
        }

        VendorState newState = new VendorState(
                targetStatus,
                reason,
                Instant.now(),
                changedBy,
                changeType
        );

        Vendor updated = copyWithState(existing, newState);
        Vendor saved = vendorRepository.save(updated);

        VendorStateChange change = VendorStateChange.builder()
                .vendorId(vendorId)
                .fromStatus(currentStatus)
                .toStatus(targetStatus)
                .reason(reason)
                .changedBy(changedBy)
                .changeType(changeType)
                .changedAt(Instant.now())
                .build();

        historyRepository.save(change);

        log.info("Vendor {} transitioned: {} → {}",
                vendorId, currentStatus, targetStatus);

        return vendorDtoMapper.toResponse(saved, categoryDtoMapper, locationDtoMapper);   // FIXED
    }

    private Vendor copyWithState(Vendor existing, VendorState newState) {
        return Vendor.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .businessName(existing.getBusinessName())
                .ownerName(existing.getOwnerName())                              // ← was missing
                .description(existing.getDescription())
                .address(existing.getAddress())
                .city(existing.getCity())                                        // ← CRITICAL, was missing
                .email(existing.getEmail())
                .phone(existing.getPhone())
                .ratingAvg(existing.getRatingAvg())
                .totalRatings(existing.getTotalRatings())
                .state(newState)
                .deliveryRadius(existing.getDeliveryRadius())
                .pickupAddress(existing.getPickupAddress())
                .profileImageStorageRef(existing.getProfileImageStorageRef())
                .coverImageStorageRef(existing.getCoverImageStorageRef())
                .idCardFrontStorageRef(existing.getIdCardFrontStorageRef())
                .idCardBackStorageRef(existing.getIdCardBackStorageRef())
                .categories(existing.getCategories())
                .distributionLocations(existing.getDistributionLocations())
                .subscriptionTier(existing.getSubscriptionTier())                // ← was missing
                .createdAt(existing.getCreatedAt())
                .updatedAt(Instant.now())
                .build();
    }

    private Vendor findVendorOrThrow(UUID vendorId) {
        return vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vendor not found: " + vendorId));
    }
}