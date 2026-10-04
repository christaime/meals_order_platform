export interface ChatRequest {
  readonly message: string;
  readonly sessionId: string | null;
}

// ═══════════════════════════════════════════════════════════
//  Payload type constants — must match the backend
// ═══════════════════════════════════════════════════════════

export const PAYLOAD_TYPE = {
  MEALS: 'MEALS',
  VENDORS: 'VENDORS',
} as const;

export type PayloadType = typeof PAYLOAD_TYPE[keyof typeof PAYLOAD_TYPE];

// ═══════════════════════════════════════════════════════════
//  Domain cards — must match the backend payload field names
// ═══════════════════════════════════════════════════════════

export interface MealCard {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly price: number;
  readonly imageUrl?: string | null;
  readonly averageRating?: number | null;
  readonly totalRatings?: number | null;
  readonly prepTimeMinutes?: number | null;
  readonly vendorId?: string | null;
  readonly vendorName?: string | null;
  readonly locations?: LocationLine[];
  readonly ingredients?: IngredientLine[];
}

export interface LocationLine {
  readonly id: string;
  readonly name: string;
  readonly address?: string | null;
  readonly cityName?: string | null;
}

export interface IngredientLine {
  readonly id: string;
  readonly name: string;
  readonly isAllergen: boolean;
}

export interface VendorCard {
  readonly id: string;
  readonly businessName: string;
  readonly description?: string | null;
  readonly address?: string | null;
  readonly cityName?: string | null;
  readonly profileImageUrl?: string | null;
  readonly ratingAvg?: number | null;
  readonly totalRatings?: number | null;
  readonly cuisines?: string[];
}

// ═══════════════════════════════════════════════════════════
//  Payload data shapes
// ═══════════════════════════════════════════════════════════

export interface MealListPayload {
  readonly meals: MealCard[];
}

export interface VendorListPayload {
  readonly vendors: VendorCard[];
}

// ═══════════════════════════════════════════════════════════
//  Discriminated union — one member per payload type
// ═══════════════════════════════════════════════════════════

export interface MealsPayload {
  readonly type: typeof PAYLOAD_TYPE.MEALS;
  readonly data: MealListPayload;
}

export interface VendorsPayload {
  readonly type: typeof PAYLOAD_TYPE.VENDORS;
  readonly data: VendorListPayload;
}

export type KnownPayload = MealsPayload | VendorsPayload;

// ═══════════════════════════════════════════════════════════
//  Conversation
// ═══════════════════════════════════════════════════════════

export interface ChatResponse {
  readonly reply: string;
  readonly sessionId: string;
  readonly structured?: KnownPayload[] | null;
}

export interface ChatTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: Date;
  readonly structured?: KnownPayload[] | null;
}

// ═══════════════════════════════════════════════════════════
//  History pagination
// ═══════════════════════════════════════════════════════════

export interface ChatHistoryMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly createdAt: string;
  readonly structured?: KnownPayload[] | null;
}

export interface ChatHistoryResponse {
  readonly sessionId: string;
  readonly messages: ChatHistoryMessage[];
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
}
