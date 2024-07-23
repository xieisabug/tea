import IconButton from "./IconButton";
import Setting from "../assets/setting.svg";
import Experiment from "../assets/experiment.svg";
import { invoke } from "@tauri-apps/api/tauri";

function ChatUIInfomation() {
    const openConfig = async () => {
        await invoke('open_config_window')
    }

    return (
        <div className="chat-ui-information">
            <IconButton icon={Setting} onClick={openConfig} />
            <IconButton icon={Experiment} onClick={() => {}} />
        </div>
    );
}

export default ChatUIInfomation;
