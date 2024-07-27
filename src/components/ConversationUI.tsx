import { invoke } from "@tauri-apps/api/tauri";
import { writeText } from '@tauri-apps/api/clipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message } from "../data/Conversation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import SyntaxHighlighter from 'react-syntax-highlighter'
// srcery   railscasts   nnfx-dark    atelier-estuary-dark
import { srcery } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { listen } from "@tauri-apps/api/event";
import {throttle} from 'lodash';
import NewChatComponent from "./NewChatComponent";
import CircleButton from "./CircleButton";
import IconButton from "./IconButton";
import UpArrow from '../assets/up-arrow.svg';
import Stop from '../assets/stop.svg';
import Add from '../assets/add.svg';
import Run from '../assets/run.svg';
import Delete from '../assets/delete.svg';
import Copy from '../assets/copy.svg';
import Refresh from '../assets/refresh.svg';

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
                        <div className="message-code-container">
                            <div className="message-code-button-group">
                                <IconButton icon={Copy} onClick={() => writeText(String(children).replace(/\n$/, ''))} />
                                <IconButton icon={Run} onClick={() => writeText(String(children).replace(/\n$/, ''))} />
                            </div>
                            <SyntaxHighlighter
                                {...props}
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                style={srcery}
                            />
                        </div>
                    ) : (
                        <code {...props} ref={ref} className={className}>
                            {children}
                        </code>
                    );
                }
            }}
        />
        <div className="message-item-button-container">
            <IconButton icon={Delete} onClick={() => {}} />
            <IconButton icon={Refresh} onClick={() => {}} />
            <IconButton icon={Copy} onClick={() => writeText(message.content)} />
        </div>
    </div>
));

function ConversationUI({ conversationId, onChangeConversationId }: ConversationUIProps) {
    const scroll = throttle(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, 300);
    
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
        scroll();
    }, [messages]);

    const [inputText, setInputText] = useState("");
    const [aiIsResponsing, setAiIsResponsing] = useState<boolean>(false);
    const handleSend = useCallback(() => {
        if (inputText.trim() === "") {
            setInputText("");
            return;
        }
        if (aiIsResponsing) {
            return;
        }
        setAiIsResponsing(true);

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
                        const payload = event.payload as string;
                        if (payload !== "Tea::Event::MessageFinish") {
                            // 更新messages的最后一个对象
                            setMessages(prevMessages => {
                                const newMessages = [...prevMessages];
                                const index = newMessages.findIndex(msg => msg.id === res.add_message_id);
                                if (index !== -1) {
                                    newMessages[index] = {
                                        ...newMessages[index],
                                        content: event.payload as string
                                    };
                                    scroll();
                                }
                                return newMessages;
                            });
                        } else {
                            setAiIsResponsing(false);
                        }
                        
                    });
                });
        } catch (error) {
            console.error('Error:', error);
        }
        setInputText("");
    }, [inputText, conversation]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          if (e.shiftKey) {
            // Shift + Enter for new line
            return;
          } else {
            // Enter for submit
            e.preventDefault();
            handleSend();
          }
        }
    };

    const filteredMessages = useMemo(() => messages.filter(m => m.message_type !== "system"), [messages]);

    const [selectedAssistant, setSelectedAssistant] = useState(-1);

    return (
        <div className="conversation-ui">
            <div className="messages">
                {conversationId ? 
                    filteredMessages.map((message, index) => (
                        <MessageItem key={index} message={message} />
                    )): <NewChatComponent 
                            selectedAssistant={selectedAssistant} 
                            assistants={assistants} 
                            setSelectedAssistant={setSelectedAssistant} />
                }
                <div className="message-anchor"></div>
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <textarea
                    className="input-area-textarea"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                
                <CircleButton onClick={() => {}} icon={Add} className="input-area-add-button" />
                <CircleButton onClick={handleSend} icon={aiIsResponsing ? Stop:UpArrow} primary className="input-area-send-button" />

            </div>
        </div>
    );
}

export default ConversationUI;
