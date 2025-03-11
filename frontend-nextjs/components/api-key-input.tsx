import React, { useState, useEffect } from 'react';
import { useSearchStore } from '@/lib/store';

export function ApiKeyInput() {
  const { apiKey, setApiKey } = useSearchStore();
  const [localKey, setLocalKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('googleApiKey');
    if (savedKey) {
      setLocalKey(savedKey);
      setApiKey(savedKey);
    }
  }, [setApiKey]);

  const handleSaveKey = () => {
    localStorage.setItem('googleApiKey', localKey);
    setApiKey(localKey);
  };

  return (
    <div className="mb-6 p-4 border border-gray-700 rounded-lg">
      <h2 className="text-lg font-semibold mb-2 text-ivory">Google AI API Key</h2>
      <div className="flex items-center">
        <input
          type={isVisible ? "text" : "password"}
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          placeholder="Enter your Google Generative AI API key"
          className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded-l-md text-ivory"
        />
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-ivory"
          title={isVisible ? "Hide API key" : "Show API key"}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
        <button
          onClick={handleSaveKey}
          className="px-3 py-2 bg-blue-600 rounded-r-md text-white"
        >
          Save
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Your API key is stored locally in your browser and never sent to our servers.
      </p>
    </div>
  );
} 