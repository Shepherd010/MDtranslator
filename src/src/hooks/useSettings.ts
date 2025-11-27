"use client";

import { useState, useCallback, useEffect } from 'react';

export interface Settings {
  llm_provider: string;
  llm_model: string;
  temperature: number;
  num_chunks: number;
  auto_save: boolean;
}

const defaultSettings: Settings = {
  llm_provider: 'qwen',
  llm_model: 'qwen-flash',
  temperature: 0.1,
  num_chunks: 3,
  auto_save: true
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const saveAndClose = useCallback(async () => {
    await saveSettings();
    closeSettings();
  }, [saveSettings, closeSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    showSettings,
    updateSettings,
    saveSettings,
    openSettings,
    closeSettings,
    saveAndClose,
  };
}
