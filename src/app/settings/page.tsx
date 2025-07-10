import React from 'react';
import { SettingsDashboard } from 'components/SettingsDashboard';

const SettingsPage: React.FC = () => {
  return (
    <main>
      <h1 className="text-2xl font-bold mb-4" aria-label="Settings Page">Settings</h1>
      <SettingsDashboard />
    </main>
  );
};

export default SettingsPage; 