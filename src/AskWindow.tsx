import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import './App.css';

interface AiResponse {
    text: string;
}

function AskWindow() {
    const [query, setQuery] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const bufferRef = useRef<string>('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResponse('');
        bufferRef.current = '';
        try {
            invoke<AiResponse>('ask_ai', { request: { prompt: query } });
        } catch (error) {
            console.error('Error:', error);
            setResponse('An error occurred while processing your request.');
        }
    };

    useEffect(() => {
        const handleEsc = async (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                console.log("Closing window");
                await appWindow.close();
            }
        };

        if (inputRef.current) {
            inputRef.current.focus();
        }

        window.addEventListener('keydown', handleEsc);

        const unsubscribe = listen('quick_chat_response', (event) => {
            bufferRef.current += event.payload as string;
            setResponse(bufferRef.current);
        });

        return () => {
            window.removeEventListener('keydown', handleEsc);
            unsubscribe.then(f => f());
        };
    }, []);

    const openConfig = async () => {
        await invoke('open_config_window')
    }

    return (
        <div className="ask-window">
            <div className="chat-container" data-tauri-drag-region>
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
            <button onClick={openConfig}>设置</button>

        </div>
    );
}

export default AskWindow;
