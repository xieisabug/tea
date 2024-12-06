import { message } from "@tauri-apps/api/dialog";
import { Button } from "./ui/button";

interface ChatUIToolbarProps {
    onNewConversation: () => void;
}

function ChatUIToolbar({ onNewConversation }: ChatUIToolbarProps) {

    const onSearch = async () => {
        message("暂未实现", "很抱歉")
    }

    return (
        <div className="chat-ui-toolbar">
            <Button className="w-24" onClick={onSearch}>搜索</Button>
            <Button className="w-24 ml-4" onClick={onNewConversation}>新对话</Button>
        </div>
    );
}

export default ChatUIToolbar;
