import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STATUS_COLORS = {
  complete: '#22c55e', // green
  incomplete: '#ef4444', // red
};

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const isSettings = pathname === '/settings';
  const [status, setStatus] = useState<'complete' | 'incomplete' | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatusAndApiHealth() {
      try {
        // Setup status
        const res = await fetch('/api/setup-status');
        if (!res.ok) throw new Error('Failed to fetch setup status');
        const data = await res.json();
        setStatus(data.isSetup ? 'complete' : 'incomplete');
      } catch {
        setStatus(null);
      }

      try {
        // API key health check
        const res = await fetch('/api/user-settings');
        if (!res.ok) throw new Error('Failed to fetch user settings');
        const settings = await res.json();
        let warning = null;
        // Check for missing keys
        if (!settings.anthropicApiKey || !settings.openaiApiKey) {
          warning = 'API key missing';
        } else {
          // Validate keys
          const testAnthropic = await fetch('/api/test-api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'anthropic', apiKey: settings.anthropicApiKey })
          });
          const testOpenai = await fetch('/api/test-api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'openai', apiKey: settings.openaiApiKey })
          });
          const resultAnthropic = await testAnthropic.json();
          const resultOpenai = await testOpenai.json();
          if (!resultAnthropic.valid || !resultOpenai.valid) {
            warning = 'API key invalid';
          }
        }
        setApiWarning(warning);
      } catch {
        setApiWarning(null);
      }
    }
    fetchStatusAndApiHealth();
  }, []);

  return (
    <nav aria-label="Main navigation">
      <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            href="/settings"
            aria-label="Settings"
            aria-current={isSettings ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Settings
            {status && (
              <span
                aria-label={status === 'complete' ? 'Settings complete' : 'Settings incomplete'}
                title={status === 'complete' ? 'Settings complete' : 'Settings incomplete'}
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: STATUS_COLORS[status],
                  marginLeft: 4,
                  border: '1px solid #ccc',
                }}
              />
            )}
            {apiWarning && (
              <span
                aria-label={apiWarning === 'API key missing' ? 'API key missing' : 'API key invalid'}
                title={apiWarning === 'API key missing' ? 'API key missing' : 'API key invalid'}
                style={{ color: '#f59e42', fontSize: 16, marginLeft: 4 }}
                role="img"
              >
                ⚠️
              </span>
            )}
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation; 