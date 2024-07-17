import { invoke } from "@tauri-apps/api/tauri";
import { writeText } from '@tauri-apps/api/clipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message } from "../data/Conversation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { listen } from "@tauri-apps/api/event";

interface ConversationUIProps {
    conversationId: string;
}

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}

const MessageItem = React.memo(({ message }: any) => (
    <div className={"message-item " + (message.message_type === "user" ? "user-message" : "bot-message")}>
        <ReactMarkdown
            children={message.content}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
                code({ node, className, children, ref, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
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
                    );
                }
            }}
        />
        <div className="message-item-button-container">
            <button className="message-item-copy-button" onClick={() => writeText(message.content)}>复制</button>
            <button className="message-item-copy-button" disabled>刷新</button>
            <button className="message-item-copy-button" disabled>删除</button>
        </div>
    </div>
));

function ConversationUI({ conversationId }: ConversationUIProps) {
    const unsubscribeRef = useRef<Promise<() => void> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [messages, setMessages] = useState<Array<Message>>([]);
    const [conversation, setConversation] = useState<Conversation>();
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setConversation(undefined);
            return
        }
        console.log(`conversationId change : ${conversationId}`);
        invoke<Array<any>>("get_conversation_with_messages", { conversationId }).then((res: any[]) => {
            setMessages(res[1]);
            setConversation(res[0]);
        });

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current.then(f => f());
            }
        };
    }, [conversationId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const [inputText, setInputText] = useState("");

    const handleSend = useCallback(() => {
        if (inputText.trim() === "") {
            setInputText("");
            return;
        }
        if (!conversation || !conversation.id) {
            return;
        }
        try {
            const userMessage = {
                id: 0,
                conversation_id: conversation.id,
                llm_model_id: -1,
                content: inputText,
                token_count: 0,
                message_type: "user",
                created_time: new Date()
            };

            setMessages(prevMessages => [...prevMessages, userMessage]);
            invoke<AiResponse>('ask_ai', { request: { prompt: inputText, conversation_id: conversation.id + "", assistant_id: conversation.assistant_id } })
                .then((res) => {
                    console.log("ask ai response", res);
                    if (unsubscribeRef.current) {
                        console.log('Unsubscribing from previous event listener');
                        unsubscribeRef.current.then(f => f());
                    }
                    const assistantMessage = {
                        id: res.add_message_id,
                        conversation_id: conversation.id,
                        llm_model_id: -1,
                        content: "",
                        token_count: 0,
                        message_type: "assistant",
                        created_time: new Date()
                    };

                    setMessages(prevMessages => [...prevMessages, assistantMessage]);

                    console.log("Listening for response", `message_${res.add_message_id}`);
                    unsubscribeRef.current = listen(`message_${res.add_message_id}`, (event) => {
                        // 更新messages的最后一个对象
                        setMessages(prevMessages => {
                            const newMessages = [...prevMessages];
                            const index = newMessages.findIndex(msg => msg.id === res.add_message_id);
                            if (index !== -1) {
                                newMessages[index] = {
                                    ...newMessages[index],
                                    content: event.payload as string
                                };
                            }
                            return newMessages;
                        });
                    });
                });
        } catch (error) {
            console.error('Error:', error);
        }
        setInputText("");
    }, [inputText, conversation]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSend();
        }
    };

    const filteredMessages = useMemo(() => messages.filter(m => m.message_type !== "system"), [messages]);

    return (
        <div className="conversation-ui">
            <div className="messages">
                {filteredMessages.map((message, index) => (
                    <MessageItem key={index} message={message} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}

export default ConversationUI;
