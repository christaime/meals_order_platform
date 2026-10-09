import { InjectionToken, Injectable, inject } from '@angular/core';
import { HttpClient , HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ChatRequest, ChatResponse, ChatHistoryResponse } from '@core/models/ai/chat.models';

/**
 * API call client for the MealMate backend.
 *
 * The backend endpoint is public — the interceptor attaches a bearer
 * token when one is available, and skips it when the user is anonymous.
 */
export abstract class ChatService {

    abstract send(request: ChatRequest): Observable<ChatResponse> ;

    abstract history(sessionId: string, beforeId: string | null, limit: number): Observable<ChatHistoryResponse> ;
}
export const CHAT_SERVICE = new InjectionToken<ChatService>('ChatService');
