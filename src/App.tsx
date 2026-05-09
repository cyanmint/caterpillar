import { useEffect, useMemo, useState } from 'react';
import { HeartPulse, Trophy } from 'lucide-react';
import { PillEditor } from './components/PillEditor';
import type { LocalPillTemplate, PillTemplatePayload } from './types/pill';
import './styles/app.css';

const LOCAL_PILLS_KEY = 'caterpillar.localPillTemplates.v1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function loadLocalPills(): LocalPillTemplate[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_PILLS_KEY);
    return raw ? (JSON.parse(raw) as LocalPillTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveLocalPills(pills: LocalPillTemplate[]) {
  window.localStorage.setItem(LOCAL_PILLS_KEY, JSON.stringify(pills));
}

async function submitPillTemplate(payload: PillTemplatePayload) {
  const response = await fetch(`${API_BASE_URL}/api/pill-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Template submission failed: ${response.status}`);
  }

  return (await response.json()) as { id: string };
}

function createLocalTemplate(payload: PillTemplatePayload): LocalPillTemplate {
  return {
    ...payload,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    syncStatus: 'local-only',
  };
}

export default function App() {
  const [localPills, setLocalPills] = useState<LocalPillTemplate[]>(loadLocalPills);
  const [statusMessage, setStatusMessage] = useState('Offline-ready: pill templates save on this device first.');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    saveLocalPills(localPills);
  }, [localPills]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const streak = useMemo(() => Math.min(localPills.length, 30), [localPills.length]);
  const petEnergy = Math.min(100, 55 + streak * 5);

  async function syncTemplate(template: LocalPillTemplate) {
    if (!navigator.onLine) {
      setStatusMessage('Still offline. The pill remains safely stored on this device.');
      return;
    }

    try {
      const remote = await submitPillTemplate(template);
      setLocalPills((current) => current.map((pill) => (
        pill.localId === template.localId ? { ...pill, syncStatus: 'synced', remoteId: remote.id } : pill
      )));
      setStatusMessage(`${template.drugName} synced to the shared D1 pill repo.`);
    } catch {
      setLocalPills((current) => current.map((pill) => (
        pill.localId === template.localId ? { ...pill, syncStatus: 'sync-failed' } : pill
      )));
      setStatusMessage(`${template.drugName} remains saved locally; backend sync is unavailable.`);
    }
  }

  async function handlePillExport(payload: PillTemplatePayload) {
    const localTemplate = createLocalTemplate(payload);
    setLocalPills((current) => [localTemplate, ...current]);
    setStatusMessage(`${payload.drugName} ${payload.dosageLabel} saved locally for offline access.`);

    if (!navigator.onLine) {
      setStatusMessage(`${payload.drugName} saved locally. It can sync when the backend is available.`);
      return;
    }

    await syncTemplate(localTemplate);
  }

  async function requestReminderPermission() {
    if (!('Notification' in window)) {
      setStatusMessage('This WebView does not expose the Notifications API, but local pill data still works offline.');
      return;
    }

    const permission = await Notification.requestPermission();
    setStatusMessage(permission === 'granted'
      ? 'Notifications enabled. Native wrappers can bridge these reminders to Android/iOS alarms.'
      : 'Notifications were not enabled. You can still use offline pill tracking.');
  }

  return (
    <main className="app-shell">
      <header>
        <h1>Caterpillar Care</h1>
        <p>Medication adherence through visual pill matching, gentle reminders, and pet nurturing.</p>
        <p className="status-pill" role="status">{isOnline ? 'Online' : 'Offline'} · {statusMessage}</p>
      </header>

      <div className="grid-layout">
        <PillEditor onExport={(payload) => void handlePillExport(payload)} />

        <section className="card" aria-labelledby="pet-title">
          <h2 id="pet-title"><HeartPulse aria-hidden="true" /> Pet dashboard</h2>
          <p>Your pet gains energy from on-time doses and stays usable offline from local pill history.</p>
          <svg viewBox="0 0 256 180" role="img" aria-label={`Caterpillar pet with ${petEnergy} percent energy`} width="100%">
            <circle cx="64" cy="96" r="34" fill="#86efac" opacity={petEnergy < 65 ? '0.55' : '1'} />
            <circle cx="112" cy="96" r="38" fill="#4ade80" opacity={petEnergy < 55 ? '0.55' : '1'} />
            <circle cx="164" cy="96" r="34" fill="#22c55e" />
            <circle cx="200" cy="82" r="30" fill="#16a34a" />
            <circle cx="190" cy="74" r="4" fill="#020617" />
            <circle cx="210" cy="74" r="4" fill="#020617" />
            <path d={petEnergy > 60 ? 'M188 91q12 10 24 0' : 'M188 99q12-10 24 0'} fill="none" stroke="#020617" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p><Trophy aria-hidden="true" /> Local streak preview: {streak} day{streak === 1 ? '' : 's'}. Global leaderboard syncs through D1 when online.</p>
          <button className="pill-button" type="button" onClick={() => void requestReminderPermission()}>Enable dose reminders</button>
        </section>

        <section className="card" aria-labelledby="offline-title">
          <h2 id="offline-title">Offline pill box</h2>
          <p>Saved templates remain available in this WebView even when the Worker is unavailable.</p>
          {localPills.length === 0 ? (
            <p>No local pill templates yet. Export one from the editor to populate offline mode.</p>
          ) : (
            <ul className="pill-list">
              {localPills.map((pill) => (
                <li key={pill.localId}>
                  <img className="pill-thumb" src={`data:image/svg+xml;utf8,${encodeURIComponent(pill.svg)}`} alt="" />
                  <span>{pill.drugName} · {pill.dosageLabel} · {pill.pillsPerBox} pills/box</span>
                  <span className="status-pill">{pill.syncStatus}</span>
                  {pill.syncStatus !== 'synced' && (
                    <button className="pill-button" type="button" onClick={() => void syncTemplate(pill)}>Retry sync</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
