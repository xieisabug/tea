import AskWindowPrepare from "./AskWindowPrepare";
import CustomSelect from "./CustomSelect";

interface AssistantListItem {
    id: number;
    name: string;
}

interface NewChatComponentProps {
    selectedAssistant: number;
    setSelectedAssistant: (assistantId: number) => void;
    assistants: AssistantListItem[];
}

const NewChatComponent: React.FC<NewChatComponentProps> = ({selectedAssistant, setSelectedAssistant, assistants}: NewChatComponentProps) => {
    return <div className="new-chat" data-tauri-drag-region>
        <div className="new-chat-hint" data-tauri-drag-region>
            <AskWindowPrepare />
            <p data-tauri-drag-region>请选择一个对话，或者选择一个助手开始新聊天</p>
        </div>
        <CustomSelect
            options={assistants.map((assistant) => ({value: assistant.id.toString(), label: assistant.name}))}
            value={selectedAssistant+""}
            onChange={(value) => setSelectedAssistant(+value)}
        />
    </div>
}

export default NewChatComponent;