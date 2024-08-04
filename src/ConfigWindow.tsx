import React, {ReactNode, useEffect, useState} from "react";
import SideMenu from "./components/SideMenu.tsx";
import LLMProviderConfig from "./components/LLMProviderConfig.tsx";
import AssistantConfig from "./components/AssistantConfig.tsx";
import FeatureAssistantConfig from "./components/FeatureAssistantConfig.tsx";
import Model from "./assets/model.svg?react";
import Assistant from "./assets/assistant.svg?react";
import Program from "./assets/program.svg?react";
import { listen } from "@tauri-apps/api/event";
import SuccessNotification from "./components/SuccessNotification.tsx";
import AlertDialog, { AlertDialogParam } from "./components/AlertDialog.tsx";

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
    const menuList:Array<MenuItem> = [
        {id: 'llm-provider-config', name: '大模型配置', icon: <Model fill="black"/>, iconSelected: <Model fill="white"/>},
        {id: 'assistant-config', name: '个人助手配置', icon: <Assistant fill="black"/>, iconSelected: <Assistant fill="white"/>},
        {id: 'feature-assistant-config', name: '程序助手配置', icon: <Program fill="black"/>, iconSelected: <Program fill="white"/>},
    ];

    const [selectedMenu, setSelectedMenu] = useState<string>('llm-provider-config');
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        console.log("listen config-window-success-notification");
        
        listen('config-window-success-notification', () => {
            setShowNotification(true);
        });

        listen<AlertDialogParam>('config-window-alert-dialog', (event) => {
            setIsAlertDialogOpen(true);
            setAlertDialogText(event.payload.text);
            setAlertDialogType(event.payload.type);
        });
    }, []);

    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
    const [alertDialogText, setAlertDialogText] = useState('');
    const [alertDialogType, setAlertDialogType] = useState('');


    return (
        <div className="config-window">
            <SideMenu menu={menuList} selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
            <div className="config-content">
                {contentMap[selectedMenu]}
            </div>

            {showNotification && (
                <SuccessNotification
                    message="操作成功！"
                    duration={1500}
                    onClose={() => setShowNotification(false)}
                />
            )}

            <AlertDialog
                alertText={alertDialogText}
                isOpen={isAlertDialogOpen}
                onClose={() => setIsAlertDialogOpen(false)}
                alertType={alertDialogType as 'success' | 'warning' | 'error'}
            />
        </div>
    );
}

export default ConfigWindow;