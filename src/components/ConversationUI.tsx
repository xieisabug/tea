import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { Message } from "../data/Conversation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { listen } from "@tauri-apps/api/event";

interface ConversationUIProps {
    conversationId: string;
}

function ConversationUI({ conversationId }: ConversationUIProps) {
    let unsubscribe: Promise<() => void> | null = null;
    const [response, setResponse] = useState<string>('');

    useEffect(() => {
        if (!conversationId) {
            return
        }
        console.log(`conversationId change : ${conversationId}`);
        invoke<Array<any>>("get_conversation_with_messages", {conversationId}).then((res: any[]) => {
            setMessages(res[1])
        });

        if (unsubscribe) {
            unsubscribe.then(f => f());
        }

        unsubscribe = listen('conversation-' + conversationId, (event) => {
            setResponse(event.payload as string);
        });

        return () => {
            if (unsubscribe) {
                unsubscribe.then(f => f());
            }
        };
    }, [conversationId]);

    const [messages, setMessages] = useState<Array<Message>>([]);
    const [inputText, setInputText] = useState("");

    const handleSend = () => {
        if (inputText.trim() !== "") {
            setInputText("");
        }
    };

    return (
        <div className="conversation-ui">
            <div className="messages">
                {messages.filter(m => m.message_type !== "system").map((message, index) => (
                    <div key={index} className={message.message_type === "user" ? "user-message" : "bot-message"}>
                        <ReactMarkdown 
                            children={message.content}
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
                ))}
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}

export default ConversationUI;
