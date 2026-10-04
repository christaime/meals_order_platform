package com.mealmarket.meal.application.service;

import com.mealmarket.common.exception.ConflictException;
import com.mealmarket.common.exception.ResourceNotFoundException;
import com.mealmarket.common.pagination.DataPage;
import com.mealmarket.meal.application.dto.CityRequest;
import com.mealmarket.meal.application.dto.CityResponse;
import com.mealmarket.meal.application.mapper.CityDtoMapper;
import com.mealmarket.meal.domain.model.City;
import com.mealmarket.meal.domain.repository.CityRepository;
import com.mealmarket.meal.domain.repository.criteria.CitySearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CityService {

    private final CityRepository cityRepository;
    private final CityDtoMapper cityDtoMapper;

    // ═══════════════════════════════════════════════════════════
    //  Read
    // ═══════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<CityResponse> listAll() {
        return cityRepository.findAll().stream()
                .map(cityDtoMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CityResponse getById(UUID id) {
        return cityRepository.findById(id)
                .map(cityDtoMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + id));
    }

    @Transactional(readOnly = true)
    public DataPage<CityResponse> search(CitySearchRequest request) {
        return cityRepository.search(request).map(cityDtoMapper::toResponse);
    }

    // ═══════════════════════════════════════════════════════════
    //  Write (admin)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public CityResponse create(CityRequest request) {
        log.info("Creating city '{}' ({})", request.name(), request.countryCode());

        if (cityRepository.existsByNameAndCountryCode(
                request.name(), request.countryCode())) {
            throw new ConflictException(
                    "A city with this name already exists in " + request.countryCode());
        }

        City city = City.create(
                request.name(),
                request.region(),
                request.countryCode()
        );

        City saved = cityRepository.save(city);
        log.info("City created: {}", saved.getId());
        return cityDtoMapper.toResponse(saved);
    }

    @Transactional
    public CityResponse update(UUID id, CityRequest request) {
        log.info("Updating city: {}", id);

        City existing = cityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found: " + id));

        boolean identityChanged =
                !existing.getName().equalsIgnoreCase(request.name())
                        || !existing.getCountryCode().equalsIgnoreCase(request.countryCode());

        if (identityChanged && cityRepository.existsByNameAndCountryCode(
                request.name(), request.countryCode())) {
            throw new ConflictException(
                    "A city with this name already exists in " + request.countryCode());
        }

        City updated = existing.withDetails(
                request.name(),
                request.region(),
                request.countryCode()
        );

        return cityDtoMapper.toResponse(cityRepository.save(updated));
    }

    @Transactional
    public void delete(UUID id) {
        log.info("Deleting city: {}", id);

        if (cityRepository.findById(id).isEmpty()) {
            throw new ResourceNotFoundException("City not found: " + id);
        }

        try {
            cityRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                    "City is referenced by existing vendors or locations and cannot be deleted.");
        }
    }
}