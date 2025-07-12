import React, { useEffect, useState, useRef } from 'react';
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
  const [usage, setUsage] = useState<{ used: number; remaining: number; percentage: number; budget: number } | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    async function fetchStatusAndApiHealth() {
      try {
        const res = await fetch('/api/setup-status');
        if (!res.ok) throw new Error('Failed to fetch setup status');
        const data = await res.json();
        if (isMounted.current) setStatus(data.isSetup ? 'complete' : 'incomplete');
      } catch {
        if (isMounted.current) setStatus(null);
      }

      try {
        const res = await fetch('/api/user-settings');
        if (!res.ok) throw new Error('Failed to fetch user settings');
        const settings = await res.json();
        let warning = null;
        if (!settings.anthropicApiKey && !settings.openaiApiKey) {
          warning = 'API key missing';
        } else {
          const tests = [];
          if (settings.anthropicApiKey) {
            tests.push(fetch('/api/test-api-keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: 'anthropic', apiKey: settings.anthropicApiKey })
            }));
          }
          if (settings.openaiApiKey) {
            tests.push(fetch('/api/test-api-keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: 'openai', apiKey: settings.openaiApiKey })
            }));
          }
          const responses = await Promise.all(tests);
          const results = await Promise.all(responses.map(r => r.json()));
          if (results.some(result => !result.valid)) {
            warning = 'API key invalid';
          }
        }
        if (isMounted.current) setApiWarning(warning);
      } catch {
        if (isMounted.current) setApiWarning(null);
      }
    }
    fetchStatusAndApiHealth();

    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) throw new Error('Failed to fetch usage');
        const data = await res.json();
        if (isMounted.current) setUsage(data);
      } catch {
        if (isMounted.current) setUsage(null);
      }
    }
    fetchUsage();
    return () => { isMounted.current = false; };
  }, []);

  return (
    <nav aria-label="Main navigation">
      <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link
            href="/settings"
            aria-label="Settings"
            aria-current={isSettings ? 'page' : undefined}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            Settings
            {/* Status indicator */}
            {status && (
              <span
                aria-label={status === 'complete' ? 'Settings complete' : 'Settings incomplete'}
                title={status === 'complete' ? 'Settings complete' : 'Settings incomplete'}
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: status === 'complete' ? STATUS_COLORS.complete : STATUS_COLORS.incomplete,
                  marginLeft: 6,
                }}
              />
            )}
            {/* API warning */}
            {apiWarning && !usage && (
              <span
                aria-label={apiWarning}
                title={apiWarning}
                style={{ color: '#f59e42', marginLeft: 4, fontSize: 16 }}
              >
                ⚠️
              </span>
            )}
            {/* Usage/budget indicator */}
            {usage && typeof usage.used === 'number' && typeof usage.budget === 'number' && typeof usage.percentage === 'number' ? (
              <span
                aria-label={`API usage: $${usage.used.toFixed(2)} of $${usage.budget.toFixed(2)} (${usage.percentage.toFixed(0)}%)`}
                title={`API usage: $${usage.used.toFixed(2)} of $${usage.budget.toFixed(2)} (${usage.percentage.toFixed(0)}%)`}
                style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <span
                  style={{
                    width: 40,
                    height: 6,
                    background: '#eee',
                    borderRadius: 3,
                    overflow: 'hidden',
                    display: 'inline-block',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${Math.min(usage.percentage, 100)}%`,
                      background: usage.percentage >= 90 ? '#ef4444' : '#22c55e',
                      transition: 'width 0.3s',
                    }}
                  />
                </span>
                <span style={{ fontSize: 10, color: usage.percentage >= 90 ? '#ef4444' : '#666', marginLeft: 2 }}>
                  {`${usage.percentage.toFixed(0)}%`}
                </span>
              </span>
            ) : null}
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation; 