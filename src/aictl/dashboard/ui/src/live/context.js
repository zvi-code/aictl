import { createContext } from 'preact';
import { html } from 'htm/preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { createLiveController } from './controller.js';

const LiveContext = createContext(null);
const LEGACY = { mode: 'legacy', capabilities: null, entities: new Map(), ready: false };

export function LiveProvider({ children, controller }) {
  const client = useMemo(() => controller || createLiveController(), [controller]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  return html`<${LiveContext.Provider} value=${client}>${children}<//>`;
}

export function useLiveState() {
  const client = useContext(LiveContext);
  const [state, setState] = useState(() => client?.getState() || LEGACY);
  useEffect(() => {
    if (!client) return undefined;
    const unsubscribe = client.subscribe(setState);
    setState(client.getState());
    return unsubscribe;
  }, [client]);
  return { client, state };
}
