import { invoke } from "@tauri-apps/api/tauri";

interface ChatUIToolbarProps {
    onNewConversation: () => void;
}

function ChatUIToolbar({onNewConversation} : ChatUIToolbarProps) {
    const openConfig = async () => {
        await invoke('open_config_window')
    }

    return (
        <div className="chat-ui-toolbar">
            <button onClick={onNewConversation}>新对话</button>
            <button onClick={openConfig}>设置</button>
        </div>
    );
}

export default ChatUIToolbar;
