import { useEffect, useState } from "react";
import {invoke} from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { confirm } from '@tauri-apps/api/dialog';

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

        const index = conversations.findIndex(c => conversationId == c.id);
        if (index === -1) {
            onSelectConversation("");
        }

        return () => {
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, [conversations])

    const deleteConversation = async (id: string) => {
        const confirmed = await confirm('This action cannot be reverted. Are you sure?', { title: 'Tauri', type: 'warning' });
        if (confirmed) {
            invoke("delete_conversation", {conversationId: id}).then(() => {
                return invoke<Array<Conversation>>("list_conversations", {page: 1, pageSize: 100});
            }).then((conversations: Conversation[]) => {
                setConversations(conversations);
            });
        }
    }

    return (
        <div className="conversation-list">
            <ul>
                {conversations.map((conversation) => (
                    <li className={`${conversationId == conversation.id? "selected": ""}`} key={conversation.id} onClick={() => {
                        console.log(`click : ${JSON.stringify(conversation)}`)
                        onSelectConversation(conversation.id);
                    }}>
                        <div>{conversation.name}</div>
                        <button className="mini" onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id)
                        }} >删除</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ConversationList;
