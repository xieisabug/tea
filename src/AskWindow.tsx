import React, {useEffect, useRef, useState} from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import './App.css';

interface AiResponse {
    text: string;
}
function AskWindow() {
    const [query, setQuery] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const handleEsc = async (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                console.log("Closing window")
                await appWindow.close();
            }
        };
        if (inputRef.current) {
            inputRef.current.focus();
        }

        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    return (
        <div className="ask-window" >
            <div className="chat-container" data-tauri-drag-region >
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
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
