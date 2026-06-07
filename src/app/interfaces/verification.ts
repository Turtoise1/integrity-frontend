export interface AnchorVerificationResult {
  match: boolean;
  storedHash: string;
  currentHash: string;
  timestamp: number;
}
