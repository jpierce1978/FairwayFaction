import { useMemo } from 'react';
import { buildHomeViewModel, type HomeViewModel } from '@/domains/rounds/home';
import { createMockHomeData } from '@/dev/mockData';

/**
 * Milestone 1: backed by development mock data. The screen consumes only the
 * HomeViewModel, so swapping in real repositories later changes this hook, not the UI.
 */
export function useHomeData(options: { withActiveRound?: boolean } = {}): {
  status: 'ready';
  viewModel: HomeViewModel;
  isMock: true;
} {
  const { withActiveRound = false } = options;
  const viewModel = useMemo(
    () => buildHomeViewModel(createMockHomeData(new Date(), withActiveRound)),
    [withActiveRound],
  );
  return { status: 'ready', viewModel, isMock: true };
}
