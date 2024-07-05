import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';

interface AiResponse {
    text: string;
}
function AskWindow() {
    const [query, setQuery] = useState<string>('');
    const [response, setResponse] = useState<string>('');

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

    return (
        <div className="App">
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
            </div>
        </div>
    );
}

export default AskWindow;
