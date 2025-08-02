'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { currencies, timezones, countries, countryDefaults } from '@/lib/countryDefaults';

interface UserSettings {
  firstName: string;
  lastName: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  country: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    currency: '',
    currencySymbol: '',
    timezone: '',
    country: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          timezone: data.timezone,
          country: data.country,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode);
    if (currency) {
      setFormData({
        ...formData,
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const defaults = countryDefaults[countryCode];
    if (defaults) {
      setFormData({
        ...formData,
        country: countryCode,
        currency: defaults.currency,
        currencySymbol: defaults.currencySymbol,
        timezone: defaults.timezone,
      });
    } else {
      setFormData({
        ...formData,
        country: countryCode,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Settings save error:', errorData);
        setMessage(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Changing country will update currency and timezone to defaults
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Current symbol: {formData.currencySymbol}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              >
                {timezones.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Current time: {new Date().toLocaleString('en-US', {
                  timeZone: formData.timezone,
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {message && (
              <div className={`text-sm text-center ${
                message.includes('successfully') ? 'text-green-600' : 'text-red-600'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>

          {settings && (
            <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Settings</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Name:</span> {settings.firstName} {settings.lastName}</p>
                <p><span className="text-gray-600">Country:</span> {countries.find(c => c.code === settings.country)?.name || settings.country}</p>
                <p><span className="text-gray-600">Currency:</span> {settings.currency} ({settings.currencySymbol})</p>
                <p><span className="text-gray-600">Timezone:</span> {settings.timezone}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}