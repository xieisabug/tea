import React, {useState} from "react";
import SideMenu from "./components/SideMenu.tsx";
import LLMProviderConfig from "./components/LLMProviderConfig.tsx";
import AssistantConfig from "./components/AssistantConfig.tsx";

interface MenuItem {
    id: string;
    name: string;
    icon: string;
}

const contentMap: Record<string, React.ReactElement> = {
    'llm-provider-config': <LLMProviderConfig />,
    'assistant-config': <AssistantConfig />,
}

function ConfigWindow() {
    const menuList:Array<MenuItem> = [
        {id: 'llm-provider-config', name: '大模型配置', icon: 'icon1'},
        {id: 'assistant-config', name: '个人助手配置', icon: 'icon2'},
    ];

    const [selectedMenu, setSelectedMenu] = useState<string>('llm-provider-config');

    return (
        <div className="config-window">
            <SideMenu menu={menuList} selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
            <div className="config-content">
                {contentMap[selectedMenu]}
            </div>
        </div>
    );
}

export default ConfigWindow;