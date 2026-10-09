import { Injectable, inject } from '@angular/core';
import { HttpClient , HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ChatRequest, ChatResponse, ChatHistoryResponse } from '@core/models/ai/chat.models';
import { ChatService } from './chat.service';
/**
 * HTTP client for the MealMate backend.
 *
 * The backend endpoint is public — the interceptor attaches a bearer
 * token when one is available, and skips it when the user is anonymous.
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService implements ChatService{

    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/ai/chat`;

    send(request: ChatRequest): Observable<ChatResponse> {
      return this.http.post<ChatResponse>(this.base, request);
    }

    history(sessionId: string, beforeId: string | null, limit = 10): Observable<ChatHistoryResponse> {
      let params = new HttpParams().set('limit', limit);
      if (beforeId) params = params.set('beforeId', beforeId);
      return this.http.get<ChatHistoryResponse>(
        `${this.base}/${sessionId}/messages`, { params });
    }
}
