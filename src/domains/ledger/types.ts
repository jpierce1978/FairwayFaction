import type { GameInstanceId, LedgerEntryId, RoundId, RoundPlayerId } from '@/types/ids';

export type LedgerEntryStatus = 'CALCULATED' | 'ACKNOWLEDGED' | 'VOID';

/** A neutral obligation: fromRoundPlayer owes toRoundPlayer. No payment processing in the MVP. */
export interface LedgerEntry {
  id: LedgerEntryId;
  roundId: RoundId;
  gameInstanceId: GameInstanceId;
  fromRoundPlayerId: RoundPlayerId;
  toRoundPlayerId: RoundPlayerId;
  units: number;
  unitType: string;
  configuredValue: number | null;
  displayValue: string | null;
  description: string;
  status: LedgerEntryStatus;
}
