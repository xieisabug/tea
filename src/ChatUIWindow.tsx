import React, {useState} from "react";
import ChatUIToolbar from "./components/ChatUIToolbar";
import ConversationList from "./components/ConversationList";
import ChatUIInfomation from "./components/ChatUIInfomation";
import ConversationUI from "./components/ConversationUI";

import "./components/ChatUIWindow.css";

function ChatUIWindow() {

    return (
        <div className="chat-ui-window">
            <div className="left-side">
                <ChatUIToolbar />
                <ConversationList />
                <ChatUIInfomation />
            </div>

            <div className="center-content">
                <ConversationUI />
            </div>
        </div>
    );
}

export default ChatUIWindow;