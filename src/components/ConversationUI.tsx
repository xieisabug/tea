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

interface AssistantListItem {
    id: number;
    name: string;
}

interface ConversationUIProps {
    conversationId: string;
    onChangeConversationId: (conversationId: string) => void;
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
            <button className="mini" onClick={() => writeText(message.content)}>复制</button>
            <button className="mini" disabled>刷新</button>
            <button className="mini" disabled>删除</button>
        </div>
    </div>
));

function ConversationUI({ conversationId, onChangeConversationId }: ConversationUIProps) {
    const unsubscribeRef = useRef<Promise<() => void> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [messages, setMessages] = useState<Array<Message>>([]);
    const [conversation, setConversation] = useState<Conversation>();
    const [assistants, setAssistants] = useState<AssistantListItem[]>([]);
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setConversation(undefined);

            invoke<Array<AssistantListItem>>("get_assistants").then((assistantList) => {
                setAssistants(assistantList);
                if (assistantList.length > 0) {
                    setSelectedAssistant(assistantList[0].id);
                }
            });
            return
        }
        console.log(`conversationId change : ${conversationId}`);
        invoke<Array<any>>("get_conversation_with_messages", { conversationId: +conversationId }).then((res: any[]) => {
            setMessages(res[1]);
            setConversation(res[0]);
        });

        return () => {
            if (unsubscribeRef.current) {
                console.log("unsubscribe")
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
        let conversationId = "";
        let assistantId = "";
        if (!conversation || !conversation.id) {
            assistantId = selectedAssistant + "";
        } else {
            conversationId = conversation.id + "";
            assistantId = conversation.assistant_id + "";
        }
        try {
            const userMessage = {
                id: 0,
                conversation_id: conversationId? -1: +conversationId,
                llm_model_id: -1,
                content: inputText,
                token_count: 0,
                message_type: "user",
                created_time: new Date()
            };

            setMessages(prevMessages => [...prevMessages, userMessage]);
            invoke<AiResponse>('ask_ai', { request: { prompt: inputText, conversation_id: conversationId, assistant_id: +assistantId } })
                .then((res) => {
                    console.log("ask ai response", res);
                    if (unsubscribeRef.current) {
                        console.log('Unsubscribing from previous event listener');
                        unsubscribeRef.current.then(f => f());
                    }

                    if (conversationId != (res.conversation_id + "")) {
                        onChangeConversationId(res.conversation_id + "");
                    } else {
                        const assistantMessage = {
                            id: res.add_message_id,
                            conversation_id: conversationId? -1: +conversationId,
                            llm_model_id: -1,
                            content: "",
                            token_count: 0,
                            message_type: "assistant",
                            created_time: new Date()
                        };
    
                        setMessages(prevMessages => [...prevMessages, assistantMessage]);
                    }
                    
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

    const [selectedAssistant, setSelectedAssistant] = useState(-1);

    return (
        <div className="conversation-ui">
            <div className="messages">
                {conversationId ? filteredMessages.map((message, index) => (
                    <MessageItem key={index} message={message} />
                )): <div>
                    <div>请选择一个对话，或者选择一个助手开始新聊天</div>
                    <select value={selectedAssistant} onChange={(e) => setSelectedAssistant(+e.target.value)}>
                        {assistants.map((assistant) => (
                            <option key={assistant.id} value={assistant.id}>{assistant.name}</option>
                        ))}
                    </select>
                    </div>}
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
