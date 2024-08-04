import IconButton from "./IconButton";
import Setting from "../assets/setting.svg?react";
import Experiment from "../assets/experiment.svg?react";
import { invoke } from "@tauri-apps/api/tauri";

function ChatUIInfomation() {
    const openConfig = async () => {
        await invoke('open_config_window')
    }

    return (
        <div className="chat-ui-information">
            <IconButton icon={<Setting fill="black"/>} onClick={openConfig} />
            <IconButton icon={<Experiment fill="black"/>} onClick={() => {}} />
        </div>
    );
}

export default ChatUIInfomation;
