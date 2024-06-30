import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';

interface Config {
  api_key: string;
  backend: string;
}

interface AiResponse {
  text: string;
}

function App() {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [config, setConfig] = useState<Config>({ api_key: '', backend: 'openai' });

  useEffect(() => {
    invoke<Config>('get_config').then(setConfig);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const result = await invoke<AiResponse>('ask_ai', { request: { prompt: query } });
      setResponse(result.text);
    } catch (error) {
      console.error('Error:', error);
      setResponse('An error occurred while processing your request.');
    }
  };

  const handleSaveConfig = async () => {
    await invoke('save_config', { config });
    setShowConfig(false);
  };

  return (
    <div className="App">
      {!showConfig ? (
        <div className="chat-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Ask AI..."
            />
            <button type="submit">Send</button>
          </form>
          <div className="response">{response}</div>
          <button onClick={() => setShowConfig(true)}>Configure</button>
        </div>
      ) : (
        <div className="config-container">
          <h2>AI Backend Configuration</h2>
          <select
            value={config.backend}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              setConfig({ ...config, backend: e.target.value })}
          >
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama</option>
          </select>
          <input
            type="password"
            value={config.api_key}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setConfig({ ...config, api_key: e.target.value })}
            placeholder="API Key"
          />
          <button onClick={handleSaveConfig}>Save</button>
          <button onClick={() => setShowConfig(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default App;
