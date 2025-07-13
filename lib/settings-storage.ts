import { getUserSettingsStorage } from './user-settings-storage';
import { SetupStatus, UserSettings, SETTING_KEYS } from '../types/settings';

export async function getSettingsStorage() {
  return getUserSettingsStorage();
}

export async function getSetupStatus(userId: string): Promise<SetupStatus | null> {
  try {
    const storage = await getSettingsStorage();
    const status = await storage.getCompleteSettings(userId);
    
    if (!status || !(status as any)[SETTING_KEYS.SETUP_STATUS]) {
      return null;
    }
    
    return JSON.parse((status as any)[SETTING_KEYS.SETUP_STATUS]);
  } catch (error) {
    console.error('Error getting setup status:', error);
    return null;
  }
}

export async function updateSetupStatus(userId: string, status: SetupStatus): Promise<void> {
  try {
    const storage = await getSettingsStorage();
    const currentSettings = await storage.getCompleteSettings(userId) || {};
    
    (currentSettings as any)[SETTING_KEYS.SETUP_STATUS] = JSON.stringify(status);
    
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
    
    const settingsAny = settings as any;
    return {
      aiProvider: settingsAny[SETTING_KEYS.AI_PROVIDER] || 'auto',
      anthropicApiKey: settingsAny[SETTING_KEYS.ANTHROPIC_API_KEY],
      openaiApiKey: settingsAny[SETTING_KEYS.OPENAI_API_KEY],
      monthlyBudget: parseFloat(settingsAny[SETTING_KEYS.MONTHLY_BUDGET]) || 100,
      citationStyle: settingsAny[SETTING_KEYS.CITATION_STYLE] || 'APA',
      language: settingsAny[SETTING_KEYS.LANGUAGE] || 'English',
      theme: settingsAny[SETTING_KEYS.THEME] || 'system',
      accessibility: settingsAny[SETTING_KEYS.ACCESSIBILITY] ? JSON.parse(settingsAny[SETTING_KEYS.ACCESSIBILITY]) : {},
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
}