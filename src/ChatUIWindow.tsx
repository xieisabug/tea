import { useEffect, useState } from "react";
import ChatUIToolbar from "./components/ChatUIToolbar";
import ConversationList from "./components/ConversationList";
import ChatUIInfomation from "./components/ChatUIInfomation";
import ConversationUI from "./components/ConversationUI";

import "./styles/ChatUIWindow.css";
import { appDataDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";

function ChatUIWindow() {
    const [pluginList, setPluginList] = useState<any[]>([]);

    const [selectedConversation, setSelectedConversation] = useState<string>("");

    useEffect(() => {
        const pluginLoadList = [
            {
                name: "代码生成",
                code: "code-generate",
                pluginType: ["assistantType"],
                instance: null
            }
        ]

        const initPlugin = async () => {
            const dirPath = await appDataDir();
            const loadPromises = pluginLoadList.map(async (plugin) => {
                const convertFilePath = dirPath + "plugin/" + plugin.code + "/dist/main.js";

                return new Promise<void>((resolve) => {
                    const script = document.createElement('script');
                    script.src = convertFileSrc(convertFilePath);
                    script.onload = () => {
                        const SamplePlugin = (window as any).SamplePlugin;
                        if (SamplePlugin) {
                            plugin.instance = new SamplePlugin();
                            console.log("plugin loaded", plugin.instance);
                        }
                        resolve();
                    };
                    document.body.appendChild(script);
                });
            });

            // 等待所有插件加载完成
            await Promise.all(loadPromises);
            
            // 所有插件实例都准备好后再更新状态
            setPluginList([...pluginLoadList]);
            console.log("setPluginList");
        }

        initPlugin();
    }, []);

    return (
        <div className="chat-ui-window">
            <div className="left-side">
                <ChatUIInfomation />
                <ChatUIToolbar onNewConversation={() => setSelectedConversation("")} />
                <ConversationList conversationId={selectedConversation} onSelectConversation={setSelectedConversation} />
            </div>

            <div className="center-content">
                <ConversationUI pluginList={pluginList} conversationId={selectedConversation} onChangeConversationId={setSelectedConversation} />
            </div>
        </div>
    );
}

export default ChatUIWindow;