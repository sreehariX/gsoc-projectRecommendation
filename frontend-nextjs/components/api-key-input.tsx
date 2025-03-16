import React, { useState } from 'react';

export function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setMessage('Please enter a valid API key');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Send the API key to a server endpoint that will validate and store it securely
      const response = await fetch('/api/set-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save API key');
      }

      setMessage('API key saved successfully');
      // Clear the input field after successful save
      setApiKey('');
    } catch (error: any) {
      setMessage(error.message || 'An error occurred while saving the API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-gray-700 rounded-lg">
      <h2 className="text-lg font-semibold mb-2 text-ivory">Google AI API Key</h2>
      <div className="flex items-center">
        <input
          type={isVisible ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
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
          disabled={isSubmitting}
          className="px-3 py-2 bg-blue-600 rounded-r-md text-white disabled:bg-blue-800"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
      <p className="mt-2 text-sm text-gray-400">
        Your API key will be securely stored on the server and never exposed to the client.
      </p>
    </div>
  );
} 