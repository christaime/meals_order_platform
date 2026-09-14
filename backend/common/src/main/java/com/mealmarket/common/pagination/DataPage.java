package com.mealmarket.common.pagination;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
public class DataPage<T> {

    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean first;
    private final boolean last;
    private final boolean empty;

    public DataPage(List<T> content, int page, int size, long totalElements) {
        this.content = content != null ? new ArrayList<>(content) : new ArrayList<>();
        this.page = page;
        this.size = size > 0 ? size : 20;
        this.totalElements = totalElements;
        this.totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        this.first = page == 0;
        this.last = page >= totalPages - 1 || totalPages == 0;
        this.empty = this.content.isEmpty();
    }

    public static <T> DataPage<T> empty() {
        return new DataPage<>(List.of(), 0, 20, 0);
    }

    public <R> DataPage<R> map(Function<T, R> mapper) {
        List<R> mappedContent = this.content.stream()
                .map(mapper)
                .collect(Collectors.toList());
        return new DataPage<>(mappedContent, this.page, this.size, this.totalElements);
    }

    public boolean hasContent() {
        return !content.isEmpty();
    }

    public int getNumberOfElements() {
        return content.size();
    }
}