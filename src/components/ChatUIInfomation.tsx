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
            <h1 className="chat-ui-information-title">Tea</h1>
            <div className="chat-ui-information-button-group">
                <IconButton icon={<Setting fill="#468585"/>} onClick={openConfig} border />
                <IconButton icon={<Experiment fill="#468585"/>} onClick={() => {}} border />
            </div>
        </div>
    );
}

export default ChatUIInfomation;
