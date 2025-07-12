import { getUserSettingsStorage } from './user-settings-storage';
import { SetupStatus, UserSettings, SETTING_KEYS } from '../types/settings';

export async function getSettingsStorage() {
  return getUserSettingsStorage();
}

export async function getSetupStatus(userId: string): Promise<SetupStatus | null> {
  try {
    const storage = await getSettingsStorage();
    const status = await storage.getCompleteSettings(userId);
    
    if (!status || !status[SETTING_KEYS.SETUP_STATUS]) {
      return null;
    }
    
    return JSON.parse(status[SETTING_KEYS.SETUP_STATUS]);
  } catch (error) {
    console.error('Error getting setup status:', error);
    return null;
  }
}

export async function updateSetupStatus(userId: string, status: SetupStatus): Promise<void> {
  try {
    const storage = await getSettingsStorage();
    const currentSettings = await storage.getCompleteSettings(userId) || {};
    
    currentSettings[SETTING_KEYS.SETUP_STATUS] = JSON.stringify(status);
    
    await storage.storeCompleteSettings(userId, currentSettings);
  } catch (error) {
    console.error('Error updating setup status:', error);
    throw error;
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const storage = await getSettingsStorage();
    const settings = await storage.getCompleteSettings(userId) || {};
    
    return {
      aiProvider: settings[SETTING_KEYS.AI_PROVIDER] || 'auto',
      anthropicApiKey: settings[SETTING_KEYS.ANTHROPIC_API_KEY],
      openaiApiKey: settings[SETTING_KEYS.OPENAI_API_KEY],
      monthlyBudget: parseFloat(settings[SETTING_KEYS.MONTHLY_BUDGET]) || 100,
      citationStyle: settings[SETTING_KEYS.CITATION_STYLE] || 'APA',
      language: settings[SETTING_KEYS.LANGUAGE] || 'English',
      theme: settings[SETTING_KEYS.THEME] || 'system',
      accessibility: settings[SETTING_KEYS.ACCESSIBILITY] ? JSON.parse(settings[SETTING_KEYS.ACCESSIBILITY]) : {},
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
}