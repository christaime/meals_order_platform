package com.mealmarket.meal.application.mapper;

import com.mealmarket.meal.application.port.MediaStoragePort;
import org.mapstruct.Named;
import org.springframework.stereotype.Component;

/**
 * MapStruct helper: turns a MinIO storage ref into a display URL.
 *
 * Kept as a separate Spring bean rather than inlining the logic into the
 * mapper interface, because MapStruct mappers are stateless and cannot hold
 * an injected {@link MediaStoragePort}.
 *
 * Wired into mappers via:
 * <pre>
 *   &#64;Mapper(componentModel = "spring", uses = MediaUrlResolver.class)
 * </pre>
 * and selected with:
 * <pre>
 *   &#64;Mapping(target = "imageUrl", source = "imageStorageRef", qualifiedByName = "toUrl")
 * </pre>
 *
 * Null-safe: blank or null refs resolve to {@code null} (no image).
 */
@Component
public class MediaUrlResolver {

    private final MediaStoragePort storage;

    public MediaUrlResolver(MediaStoragePort storage) {
        this.storage = storage;
    }

    @Named("toUrl")
    public String toUrl(String storageRef) {
        if (storageRef == null || storageRef.isBlank()) {
            return null;
        }
        return storage.url(storageRef);
    }
}