import { useEffect, useState } from "react";
import {invoke} from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

interface ConversationListProps {
    onSelectConversation: (conversation: string) => void;
    conversationId: string;
}

interface Conversation {
    id: string;
    name: string;
}

function ConversationList({onSelectConversation, conversationId}: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        // Fetch conversations from the server
        invoke<Array<Conversation>>("list_conversations", {page: 1, pageSize: 100}).then((conversations: Conversation[]) => {
            setConversations(conversations);
        });
    }, []);

    useEffect(() => {
        console.log(`conversationId change : ${conversationId} type : ${typeof conversationId}`);
        // Fetch conversations from the server
        if (conversations.findIndex((conversation) => conversation.id === conversationId) === -1) {
            invoke<Array<Conversation>>("list_conversations", {page: 1, pageSize: 100}).then((conversations: Conversation[]) => {
                setConversations(conversations);
            });
        }
    }, [conversationId]);

    useEffect(() => {
        const unsubscribe = listen("title_change", (event) => {
            console.log("title change", event.payload);
            const [conversationId, title] = event.payload as [string, string];
            
            console.log("conversations", conversations);
            const index = conversations.findIndex((conversation) => conversation.id == conversationId);
            console.log("find index", index);
            if (index !== -1) {
                const newConversations = [...conversations];
                newConversations[index] = {...newConversations[index], name: title};
                setConversations(newConversations);
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, [conversations])

    return (
        <div className="conversation-list">
            <ul>
                {conversations.map((conversation) => (
                    <li className={`${conversationId == conversation.id? "selected": ""}`} key={conversation.id} onClick={() => {
                        console.log(`click : ${JSON.stringify(conversation)}`)
                        onSelectConversation(conversation.id);
                    }}>{conversation.name}</li>
                ))}
            </ul>
        </div>
    );
}

export default ConversationList;
