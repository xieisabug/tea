import {useEffect, useState} from "react";
import ChatUIToolbar from "./components/ChatUIToolbar";
import ConversationList from "./components/ConversationList";
import ChatUIInfomation from "./components/ChatUIInfomation";
import ConversationUI from "./components/ConversationUI";

import "./styles/ChatUIWindow.css";
import AlertDialog, { AlertDialogParam } from "./components/AlertDialog";
import { listen } from "@tauri-apps/api/event";

function ChatUIWindow() {

    const [selectedConversation, setSelectedConversation] = useState<string>("");

    useEffect(() => {
        listen<AlertDialogParam>('chat-window-alert-dialog', (event) => {
            setIsAlertDialogOpen(true);
            setAlertDialogText(event.payload.text);
            setAlertDialogType(event.payload.type);
        });
    }, []);

    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
    const [alertDialogText, setAlertDialogText] = useState('');
    const [alertDialogType, setAlertDialogType] = useState('');
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
            
            <AlertDialog
                alertText={alertDialogText}
                isOpen={isAlertDialogOpen}
                onClose={() => setIsAlertDialogOpen(false)}
                alertType={alertDialogType as 'success' | 'warning' | 'error'}
            />
        </div>
    );
}

export default ChatUIWindow;