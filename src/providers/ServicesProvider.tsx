import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/components/ui';
import { createAppServices, type AppServices } from '@/infrastructure/services';

const ServicesContext = createContext<AppServices | null>(null);

type State =
  | { status: 'loading' }
  | { status: 'ready'; services: AppServices }
  | { status: 'error'; message: string };

/**
 * Opens the local database, runs migrations, and builds the service graph before
 * anything renders. If this fails the user's data is untouched on disk.
 */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    createAppServices().then(
      (services) => !cancelled && setState({ status: 'ready', services }),
      (e: unknown) =>
        !cancelled &&
        setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === 'loading') return <LoadingState label="Opening FairwayFaction…" />;
  if (state.status === 'error') {
    return (
      <ErrorState
        title="Couldn't open the app's data"
        message={`Your saved scores have not been changed. Close and reopen the app, or try again. (${state.message})`}
        onRetry={retry}
      />
    );
  }
  return <ServicesContext.Provider value={state.services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesProvider>');
  return services;
}
