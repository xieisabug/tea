import { invoke } from "@tauri-apps/api/tauri";
import React, { useEffect, useState } from "react";
import { Message } from "../data/Conversation";

interface ConversationUIProps {
    conversationId: string;
}

function ConversationUI({ conversationId }: ConversationUIProps) {
    useEffect(() => {
        if (!conversationId) {
            return
        }
        console.log(`conversationId change : ${conversationId}`);
        invoke("get_conversation_with_messages", {conversationId}).then((res: any[]) => {
            setMessages(res[1])
        })
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
                        {message.content}
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
