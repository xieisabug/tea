import { useEffect, useState } from "react";
import {invoke} from "@tauri-apps/api/tauri";

interface ConversationListProps {
    onSelectConversation: (conversation: string) => void;
    conversationId: string;
}

interface Conversation {
    id: string;
    name: string;
}

function ConversationList({onSelectConversation, conversationId}: ConversationListProps) {
    useEffect(() => {
        // Fetch conversations from the server
        invoke<Array<Conversation>>("list_conversations", {page: 1, pageSize: 100}).then((conversations: Conversation[]) => {
            setConversations(conversations);
        });
    }, []);

    const [conversations, setConversations] = useState<Conversation[]>([]);

    return (
        <div className="conversation-list">
            <ul>
                {conversations.map((conversation) => (
                    <li className={`${conversationId === conversation.id? "selected": ""}`} key={conversation.id} onClick={() => {
                        console.log(`click : ${JSON.stringify(conversation)}`)
                        onSelectConversation(conversation.id);
                    }}>{conversation.name}</li>
                ))}
            </ul>
        </div>
    );
}

export default ConversationList;
