import {useState} from "react";
import ChatUIToolbar from "./components/ChatUIToolbar";
import ConversationList from "./components/ConversationList";
import ChatUIInfomation from "./components/ChatUIInfomation";
import ConversationUI from "./components/ConversationUI";

import "./components/ChatUIWindow.css";

function ChatUIWindow() {

    const [selectedConversation, setSelectedConversation] = useState<string>("");

    return (
        <div className="chat-ui-window">
            <div className="left-side">
                <ChatUIToolbar onNewConversation={() => setSelectedConversation("")} />
                <ConversationList conversationId={selectedConversation} onSelectConversation={setSelectedConversation} />
                <ChatUIInfomation />
            </div>

            <div className="center-content">
                <ConversationUI conversationId={selectedConversation} onChangeConversationId={setSelectedConversation} />
            </div>
        </div>
    );
}

export default ChatUIWindow;