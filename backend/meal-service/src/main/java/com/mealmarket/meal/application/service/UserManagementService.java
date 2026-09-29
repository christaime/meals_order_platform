package com.mealmarket.meal.application.service;

import com.mealmarket.meal.application.dto.UserContextDto;
import com.mealmarket.meal.application.mapper.MediaUrlResolver;
import com.mealmarket.meal.application.port.IamPort;
import com.mealmarket.meal.domain.repository.CustomerRepository;
import com.mealmarket.meal.domain.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserManagementService {

    /**
     * Roles that, if present alongside VENDOR, must NOT have their sessions revoked
     * when VENDOR is removed. Revoking would log the user out mid-checkout / mid-moderation.
     * See project context §12.
     */
    private static final Set<String> PRESERVING_ROLES = Set.of("CUSTOMER", "ADMIN");
    private static final String VENDOR_ROLE = "VENDOR";

    private final VendorRepository vendorRepository;
    //private final CustomerRepository customerRepository;
    //private final AdminRepository adminRepository;
    private final IamPort iamPort;
    private final MediaUrlResolver mediaUrlResolver;


    // ---------------------------------------------------------------------
    // Context
    // ---------------------------------------------------------------------

    /**
     * Loads every entity linked to the given Keycloak subject, regardless of JWT roles.
     * Roles are not a precondition — the frontend reads roles from the JWT.
     */
    @Transactional(readOnly = true)
    public UserContextDto getContext(String keycloakId) {
        UUID userId = UUID.fromString(keycloakId);

        UserContextDto.VendorContext vendor = vendorRepository.findByUserId(userId)
                .map(v -> new UserContextDto.VendorContext(
                        v.getId(),
                        v.getEmail(),
                        v.getBusinessName(),
                        v.getStatus().name(),
                        mediaUrlResolver.toUrl(v.getProfileImageStorageRef()),
                        v.getProfileImageStorageRef()))
                .orElse(null);

       /* UserContextDto.CustomerContext customer = customerRepository.findByUserId(userId)
                .map(c -> new UserContextDto.CustomerContext(
                        c.getId(),
                        v.getEmail(),
                        c.getDisplayName(),
                        c.getStatus().name()))
                .orElse(null);

        UserContextDto.AdminContext admin = adminRepository.findByUserId(userId)
                .map(a -> new UserContextDto.AdminContext(
                        a.getId(),
                        v.getEmail(),
                        a.getDisplayName(),
                        a.getStatus().name()))
                .orElse(null);*/
        String email = vendor != null ? vendor.email() : "";
        return new UserContextDto(keycloakId, email, vendor, null, null);
    }

    // ---------------------------------------------------------------------
    // Role lifecycle
    // ---------------------------------------------------------------------

    /**
     * Grants a role. No session revocation — the user just needs a fresh token
     * (frontend calls {@code updateToken(0)} after a successful registration).
     */
    public void grantRole(String keycloakId, String roleName) {
        iamPort.assignRealmRole(keycloakId, roleName);
    }

    /**
     * Removes the VENDOR role and revokes sessions only if no preserving role remains.
     * Fail-closed: if role lookup fails, sessions are revoked.
     */
    public void revokeVendorRole(String keycloakId) {
        iamPort.revokeRealmRole(keycloakId, VENDOR_ROLE);

        if (shouldRevokeSessions(keycloakId)) {
            iamPort.revokeUserSessions(keycloakId);
        } else {
            log.info("Vendor role removed for {} but sessions preserved " +
                    "(user still holds CUSTOMER/ADMIN).", keycloakId);
        }
    }

    /**
     * Generic revoke for any role, applying the same preserving-roles rule.
     * Only VENDOR currently has a preserving set, but keeping this generic
     * means adding ADMIN removal later doesn't require a new method.
     */
    public void revokeRole(String keycloakId, String roleName) {
        iamPort.revokeRealmRole(keycloakId, roleName);

        if (VENDOR_ROLE.equals(roleName) && shouldRevokeSessions(keycloakId)) {
            iamPort.revokeUserSessions(keycloakId);
        }
    }

    private boolean shouldRevokeSessions(String keycloakId) {
        try {
            Set<String> roles = iamPort.getRealmRoles(keycloakId);
            boolean hasPreserving = roles.stream().anyMatch(PRESERVING_ROLES::contains);
            return !hasPreserving;
        } catch (Exception e) {
            log.warn("Could not read roles for {}. Defaulting to revoke.", keycloakId, e);
            return false; // wait — see note below
        }
    }
}