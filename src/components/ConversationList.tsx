import React, { useEffect, useState } from "react";
import {invoke} from "@tauri-apps/api/tauri";

function ConversationList() {
    useEffect(() => {
        // Fetch conversations from the server
        invoke("list_conversations", {page: 1, pageSize: 100}).then((conversations) => {
            console.log(conversations);
        });
    }, []);

    const [conversations, setConversations] = useState([
        "Conversation 1",
        "Conversation 2",
        "Conversation 3"
    ]);

    return (
        <div className="conversation-list">
            <ul>
                {conversations.map((conversation, index) => (
                    <li key={index}>{conversation}</li>
                ))}
            </ul>
        </div>
    );
}

export default ConversationList;
