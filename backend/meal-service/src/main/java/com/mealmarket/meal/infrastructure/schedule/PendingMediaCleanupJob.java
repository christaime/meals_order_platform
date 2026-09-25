package com.mealmarket.meal.infrastructure.schedule;

import com.mealmarket.meal.infrastructure.config.MinioConfig;
import io.minio.*;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@ConditionalOnBean(MinioClient.class)
@RequiredArgsConstructor
@Slf4j
public class PendingMediaCleanupJob {

    private static final long GRACE_HOURS = 24;

    private final MinioClient client;
    private final MinioConfig config;

    @Scheduled(cron = "0 0 * * * *")
    public void purgeStalePendingMedia() {
        Instant cutoff = Instant.now().minus(GRACE_HOURS, ChronoUnit.HOURS);
        try {
            Iterable<Result<Item>> items = client.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(config.getBucket())
                            .recursive(true)
                            .build()
            );
            for (Result<Item> result : items) {
                Item item = result.get();
                if (item.lastModified().toInstant().isAfter(cutoff)) continue;

                StatObjectResponse stat = client.statObject(
                        StatObjectArgs.builder()
                                .bucket(config.getBucket())
                                .object(item.objectName())
                                .build()
                );
                if ("PENDING".equals(stat.userMetadata().get("status"))) {
                    log.info("Deleting orphan PENDING media {}", item.objectName());
                    client.removeObject(
                            RemoveObjectArgs.builder()
                                    .bucket(config.getBucket())
                                    .object(item.objectName())
                                    .build()
                    );
                }
            }
        } catch (Exception e) {
            log.error("Cleanup job failed", e);
        }
    }
}
