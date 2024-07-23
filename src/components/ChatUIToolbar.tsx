import { message } from "@tauri-apps/api/dialog";

interface ChatUIToolbarProps {
    onNewConversation: () => void;
}

function ChatUIToolbar({onNewConversation} : ChatUIToolbarProps) {

    const onSearch = async () => {
        message("暂未实现", "很抱歉")
    }

    return (
        <div className="chat-ui-toolbar">
            <button onClick={onSearch}>搜索</button>
            <button className="main" onClick={onNewConversation}>新对话</button>
        </div>
    );
}

export default ChatUIToolbar;
