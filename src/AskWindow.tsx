import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import UpArrow from './assets/up-arrow.svg?react';
import Stop from './assets/stop.svg?react';
import Copy from './assets/copy.svg?react';
import Ok from './assets/ok.svg?react';
import OpenFullUI from './assets/open-fullui.svg?react';
import Setting from './assets/setting.svg?react';
import AskWindowPrepare from './components/AskWindowPrepare';
import AskAIHint from './components/AskAIHint';
import IconButton from './components/IconButton';
import { throttle } from 'lodash';
import { writeText } from '@tauri-apps/api/clipboard';
import CodeBlock from './components/CodeBlock';

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

    const handleArtifact = useCallback((lang: string, inputStr: string) => {
        invoke("run_artifacts", { lang, inputStr }).then((res) => {
            console.log(res);
        });
    }, []);

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
                        {aiIsResponsing ? <Stop />: <UpArrow fill='black' />}
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
                                    <CodeBlock language={match[1]} onCodeRun={handleArtifact}>
                                        {String(children).replace(/\n$/, '')}
                                    </CodeBlock>
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
                <div className='tools' data-tauri-drag-region>
                    {
                        messageId !== -1 && !aiIsResponsing ?
                            <IconButton icon={copySuccess ? <Ok fill='black'/> : <Copy fill='black'/>} onClick={() => {
                                writeText(response);
                                setCopySuccess(true);
                                setTimeout(() => {
                                    setCopySuccess(false);
                                }, 1500)
                            }} /> : null
                    }
                    
                    <IconButton icon={<OpenFullUI fill='black'/>} onClick={openChatUI} />
                    <IconButton icon={<Setting fill='black'/>} onClick={openConfig} />
                </div>
            </div>
        </div>
    );
}

export default AskWindow;
