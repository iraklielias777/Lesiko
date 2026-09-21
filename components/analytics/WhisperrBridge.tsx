import { useEffect, useRef } from 'react';
import { useWhisperr } from '@whisperr/react';
import { bindWhisperr } from '../../whisperr-events';

/**
 * Connects the generated Whisperr event bindings to the SDK client created by
 * WhisperrProvider. Rendered once, inside the provider. Events tracked before
 * this runs are queued by the generated module, so nothing is lost and nothing
 * here blocks the first paint.
 */
export const WhisperrBridge = () => {
  const whisperr = useWhisperr();
  const bound = useRef(false);

  useEffect(() => {
    if (bound.current || !whisperr) return;
    bound.current = true;
    try {
      bindWhisperr(whisperr);
    } catch {
      /* analytics must never break the app */
    }
  }, [whisperr]);

  return null;
};
