import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import './styles/AskWindow.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import UpArrow from './assets/up-arrow.svg';
import Stop from './assets/stop.svg';
import Copy from './assets/copy.svg';
import Ok from './assets/ok.svg';
import OpenFullUI from './assets/open-fullui.svg';
import Setting from './assets/setting.svg';
import AskWindowPrepare from './components/AskWindowPrepare';
import AskAIHint from './components/AskAIHint';
import IconButton from './components/IconButton';
import { throttle } from 'lodash';
import { writeText } from '@tauri-apps/api/clipboard';

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}

function AskWindow() {
    const [query, setQuery] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const [messageId, setMessageId] = useState<number>(-1);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [aiIsResponsing, setAiIsResponsing] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    let unsubscribe: Promise<() => void> | null = null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          if (e.shiftKey) {
            // Shift + Enter for new line
            return;
          } else {
            // Enter for submit
            e.preventDefault();
            handleSubmit();
          }
        }
    };

    const handleSubmit = throttle(() => {
        if (aiIsResponsing) {
            return;
        }
        setAiIsResponsing(true);
        setResponse('');
        try {
            invoke<AiResponse>('ask_ai', { request: { prompt: query, conversation_id: "", assistant_id: 1 } })
                .then((res) => {
                    setMessageId(res.add_message_id);

                    console.log("ask ai response", res);
                    if (unsubscribe) {
                        console.log('Unsubscribing from previous event listener');
                        unsubscribe.then(f => f());
                    }

                    console.log("Listening for response", `message_${res.add_message_id}`);
                    unsubscribe = listen(`message_${res.add_message_id}`, (event) => {
                        const payload = event.payload as string
                        if (payload !== "Tea::Event::MessageFinish") {
                            setResponse(payload);
                        } else {
                            setAiIsResponsing(false);
                        }
                    });
                });
        } catch (error) {
            console.error('Error:', error);
            setResponse('An error occurred while processing your request.');
        }
    }, 200);

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
                    <textarea
                        className='ask-window-input'
                        ref={inputRef}
                        value={query}
                        onKeyDown={handleKeyDown}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
                        placeholder="Ask AI..."
                    ></textarea>
                    <button className='ask-window-submit-button' type="submit">
                        <img src={aiIsResponsing ? Stop:UpArrow} alt="submit" width="16" height="16" />
                    </button>
                </form>
                <div className="response">
                    {
                        messageId !== -1 ? ( response == "" ? <AskAIHint /> : <ReactMarkdown 
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
                    />) : <AskWindowPrepare />
                    }
                    
                </div>
                <div className='tools'>
                    {
                        messageId !== -1 && !aiIsResponsing ?
                            <IconButton icon={copySuccess ? Ok : Copy} onClick={() => {
                                writeText(response);
                                setCopySuccess(true);
                                setTimeout(() => {
                                    setCopySuccess(false);
                                }, 1500)
                            }} /> : null
                    }
                    
                    <IconButton icon={OpenFullUI} onClick={openChatUI} />
                    <IconButton icon={Setting} onClick={openConfig} />
                </div>
            </div>
        </div>
    );
}

export default AskWindow;
