import { createContext, useContext } from 'react';

type BeginnerGuideContextValue = {
  startBeginnerGuide: () => void;
};

const BeginnerGuideContext = createContext<BeginnerGuideContextValue | null>(null);

export const BeginnerGuideProvider = BeginnerGuideContext.Provider;

export function useBeginnerGuide() {
  const context = useContext(BeginnerGuideContext);
  if (!context) {
    throw new Error('useBeginnerGuide must be used within BeginnerGuideProvider.');
  }
  return context;
}
