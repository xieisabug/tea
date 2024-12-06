import AskWindowPrepare from "./AskWindowPrepare";
import CustomSelect from "./CustomSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface AssistantListItem {
    id: number;
    name: string;
}

interface NewChatComponentProps {
    selectedText: string;
    selectedAssistant: number;
    setSelectedAssistant: (assistantId: number) => void;
    assistants: AssistantListItem[];
}

const NewChatComponent: React.FC<NewChatComponentProps> = ({
    selectedText,
    selectedAssistant,
    setSelectedAssistant,
    assistants,
}: NewChatComponentProps) => {
    return (
        <div className="new-chat" data-tauri-drag-region>
            <div className="new-chat-hint" data-tauri-drag-region>
                <AskWindowPrepare selectedText={selectedText} />
                <p className="mt-4" data-tauri-drag-region>
                    请选择一个对话，或者选择一个助手开始新聊天
                </p>
            </div>
            <Select
                value={selectedAssistant.toString()}
                onValueChange={(value) => setSelectedAssistant(Number(value))}
            >
                <SelectTrigger className="w-60 mt-4">
                    <SelectValue placeholder="选择一个助手" />
                </SelectTrigger>
                <SelectContent>
                    {assistants.map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id.toString()}>
                            {assistant.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default NewChatComponent;
