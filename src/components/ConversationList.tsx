import React, { useState } from "react";

function ConversationList() {
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
