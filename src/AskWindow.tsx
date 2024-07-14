import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}

function AskWindow() {
    const [query, setQuery] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    let unsubscribe: Promise<() => void> | null = null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResponse('');
        try {
            invoke<AiResponse>('ask_ai', { request: { prompt: query, conversation_id: "", assistant_id: 1 } })
            .then((res) => {
                console.log("ask ai response", res);
                if (unsubscribe) {
                    console.log('Unsubscribing from previous event listener');
                    unsubscribe.then(f => f());
                }

                console.log("Listening for response", `message_${res.add_message_id}`);
                unsubscribe = listen(`message_${res.add_message_id}`, (event) => {
                    setResponse(event.payload as string);
                });
            });
        } catch (error) {
            console.error('Error:', error);
            setResponse('An error occurred while processing your request.');
        }
    };

    useEffect(() => {
        const handleShortcut = async (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                console.log("Closing window");
                await appWindow.close();
            } else if (event.key === 'i' && event.ctrlKey) {
                await openChatUI();
                await appWindow.close();
            }
        };

        if (inputRef.current) {
            inputRef.current.focus();
        }

        window.addEventListener('keydown', handleShortcut);

        return () => {
            window.removeEventListener('keydown', handleShortcut);
            if (unsubscribe) {
                unsubscribe.then(f => f());
            }
        };
    }, []);

    const openConfig = async () => {
        await invoke('open_config_window')
    }

    const openChatUI = async () => {
        await invoke('open_chat_ui_window')
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
                <div className="response">
                    <ReactMarkdown 
                        children={response}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={{
                            code({node, className, children, ref, ...props}) {
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                <SyntaxHighlighter
                                    {...props}
                                    PreTag="div"
                                    children={String(children).replace(/\n$/, '')}
                                    language={match[1]}
                                    style={dark}
                                />
                                ) : (
                                <code {...props} ref={ref} className={className}>
                                    {children}
                                </code>
                                )
                            }
                            }}
                    />
                </div>
            </div>
            <button onClick={openChatUI}>完整UI</button>
            <button onClick={openConfig}>设置</button>

        </div>
    );
}

export default AskWindow;
