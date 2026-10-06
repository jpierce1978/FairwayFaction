/**
 * Entitlements (paid features) are deliberately separate from permissions.
 * A user may be allowed to configure a game yet lack the entitlement for a premium one.
 * RevenueCat is NOT integrated in Milestone 1; only this seam exists.
 */
export type EntitlementTier = 'FREE' | 'PLUS' | 'FACTION_PRO' | 'LIFETIME';

export interface EntitlementCapabilities {
  tier: EntitlementTier;
  canUsePremiumGames: boolean;
}

export interface EntitlementService {
  getEntitlements(): Promise<EntitlementCapabilities>;
}

/** Default until a billing provider is wired in: everyone is on the free tier. */
export const freeEntitlementService: EntitlementService = {
  async getEntitlements() {
    return { tier: 'FREE', canUsePremiumGames: false };
  },
};
