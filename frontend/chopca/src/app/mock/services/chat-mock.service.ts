import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ChatRequest, ChatResponse, ChatHistoryResponse } from '@core/models/ai/chat.models';
import { ChatService } from '@core/services/ai';

@Injectable()
export class ChatMockService implements ChatService{

    send(request: ChatRequest): Observable<ChatResponse> {
      return of( {
               reply: request.message,
               sessionId: request.sessionId?? "1",
               structured: null
             });
    }

    history(sessionId: string, beforeId: string | null, limit = 10): Observable<ChatHistoryResponse> {
      return of( { sessionId: sessionId?? "1",
               messages: [
                  {
                    id: "1",
                    role: 'user',
                    content: "Hello!",
                    createdAt: "",
                    structured: null
                  },
                  {
                    id: "2",
                    role: 'assistant',
                    content: "Hi! How can I help you?",
                    createdAt: "",
                    structured: null
                  }
               ],
               hasMore: false,
               nextCursor: null
             });
    }
}
