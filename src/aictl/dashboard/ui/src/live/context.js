import { createContext } from 'preact';
import { html } from 'htm/preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { createLiveController } from './controller.js';

const LiveContext = createContext(null);
const LEGACY = { mode: 'legacy', capabilities: null, entities: new Map(), ready: false };

export function LiveProvider({ children, controller, enabled = true }) {
  const client = useMemo(() => controller || createLiveController(), [controller]);
  useEffect(() => { if (!enabled) return; client.start(); return () => client.stop(); }, [client, enabled]);
  return html`<${LiveContext.Provider} value=${enabled ? client : null}>${children}<//>`;
}

export function useLiveState() {
  const client = useContext(LiveContext);
  const [snapshot, setSnapshot] = useState(() => ({ client, state: client?.getState() || LEGACY }));
  useEffect(() => {
    if (!client) return undefined;
    const put = state => setSnapshot({ client, state });
    const unsubscribe = client.subscribe(put);
    put(client.getState());
    return unsubscribe;
  }, [client]);
  return { client, state: snapshot.client === client ? snapshot.state : client?.getState() || LEGACY };
}
