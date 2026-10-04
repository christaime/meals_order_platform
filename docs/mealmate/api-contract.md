# MealMate — API Contract

Base URL: `/api/v1/ai`

All responses are `application/json`. All user-facing text is in
French.

## 1. Endpoints

| Method | Path                                 | Purpose                     |
|--------|--------------------------------------|-----------------------------|
| POST   | `/chat`                              | Send one turn               |
| GET    | `/chat/{sessionId}/messages`         | Page backwards through history |

Both endpoints are public (`permitAll`). An authenticated caller
may be present or not; behavior differs as documented below.

---

## 2. POST `/chat`

### Request

```json
{
  "message": "j'aimerais manger des fruits et du taro",
  "sessionId": "8e0f7e63-3c2b-4f17-95d8-08366793ffa9"
}