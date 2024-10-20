import React, { ReactNode, useEffect, useState } from "react";
import SideMenu from "./components/SideMenu.tsx";
import LLMProviderConfig from "./components/LLMProviderConfig.tsx";
import AssistantConfig from "./components/AssistantConfig.tsx";
import FeatureAssistantConfig from "./components/FeatureAssistantConfig.tsx";
import Model from "./assets/model.svg?react";
import Assistant from "./assets/assistant.svg?react";
import Program from "./assets/program.svg?react";

interface MenuItem {
    id: string;
    name: string;
    icon: ReactNode;
    iconSelected: ReactNode;
}

const contentMap: Record<string, React.ReactElement> = {
    'llm-provider-config': <LLMProviderConfig />,
    'assistant-config': <AssistantConfig />,
    'feature-assistant-config': <FeatureAssistantConfig />,
}

function ConfigWindow() {
    const menuList: Array<MenuItem> = [
        { id: 'llm-provider-config', name: '大模型配置', icon: <Model fill="gray" />, iconSelected: <Model fill="black" /> },
        { id: 'assistant-config', name: '个人助手配置', icon: <Assistant fill="gray" />, iconSelected: <Assistant fill="black" /> },
        { id: 'feature-assistant-config', name: '程序助手配置', icon: <Program fill="gray" />, iconSelected: <Program fill="black" /> },
    ];

    const [selectedMenu, setSelectedMenu] = useState<string>('llm-provider-config');

    useEffect(() => {
        console.log("listen config-window-success-notification");
    }, []);

    return (
        <div className="mx-auto grid md:grid-cols-[210px_1fr] lg:grid-cols-[250px_1fr] bg-background">
            <SideMenu menu={menuList} selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
            <div className="max-h-screen overflow-auto">
                {contentMap[selectedMenu]}
            </div>
        </div>
    );
}

export default ConfigWindow;