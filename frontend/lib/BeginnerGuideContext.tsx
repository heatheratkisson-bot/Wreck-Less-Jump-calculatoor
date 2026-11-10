import { createContext, useCallback, useContext, useRef } from 'react';
import type { View as NativeView } from 'react-native';

type BeginnerGuideTarget = {
  routeName: string;
  x: number;
  y: number;
};

type BeginnerGuideContextValue = {
  startBeginnerGuide: () => void;
  reportGuideTarget: (target: BeginnerGuideTarget) => void;
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

export function useBeginnerGuideTarget(routeName: string) {
  const { reportGuideTarget } = useBeginnerGuide();
  const targetRef = useRef<NativeView>(null);
  const setTargetRef = useCallback((view: NativeView | null) => {
    targetRef.current = view;
  }, []);
  const onLayout = useCallback(() => {
    requestAnimationFrame(() => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          reportGuideTarget({
            routeName,
            x: x + width / 2,
            y: y + height / 2,
          });
        }
      });
    });
  }, [reportGuideTarget, routeName]);

  return { ref: setTargetRef, onLayout };
}
