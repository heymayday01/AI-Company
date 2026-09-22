// Shared client-side types — mirror of the backend serialization.

import type { Bucket } from "@/lib/reflex/schema";

export interface CategoryProb {
  category: string;
  prob: number;
}

export interface EmailDTO {
  id: string;
  sender: string;
  senderName: string | null;
  subject: string;
  snippet: string;
  body: string;
  category: string;
  attention: number;
  bucket: Bucket;
  confidence: number;
  topCandidates: CategoryProb[];
  distribution: Record<string, number>;
  actionNeeded: number;
  fromHuman: number;
  consequence: number;
  churnSignal: number;
  isSample: boolean;
  source: "local" | "llm" | "fallback";
  corrected: boolean;
  createdAt: string;
  triagedAt: string;
}

export interface CalibrationStats {
  totalEmails: number;
  correctionsCount: number;
  accuracy: number;
  ece: number;
  reviewRate: number;
  bucketCounts: Record<string, number>;
}

export interface DecisionDTO {
  category: string;
  confidence: number;
  attention: number;
  bucket: Bucket;
  actionNeeded: number;
  fromHuman: number;
  consequence: number;
  churnSignal: number;
  distribution: Record<string, number>;
  topCandidates: CategoryProb[];
  latencyMs: number;
  source: "llm" | "fallback";
  reviewThreshold: number;
}
