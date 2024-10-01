import React, { useEffect, useState } from 'react';
import { appDataDir } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';

function PluginWindow() {
    const [pluginNode, setPluginNode] = useState<React.ReactNode>(null);

    useEffect(() => {
        const initPage = async () => {
            const dirPath = await appDataDir();
            const convertFilePath = convertFileSrc(dirPath + "plugin/tea-plugin-template/dist/main.js");

            try {
                // const plugin = await import("C:/Users/admin/AppData/Roaming/com.xieisabug.tea/plugin/tea-plugin-template/dist/main.js" as any);
                const plugin = await import(convertFilePath as any);

                // 检查 plugin.default 是否是一个类（构造函数）
                if (typeof plugin.default === 'function') {
                    // 如果是类，创建一个实例
                    const instance = new plugin.default();
                    // 调用实例的 onPluginLoad 方法（如果存在）
                    if (typeof instance.onPluginLoad === 'function') {
                        instance.onPluginLoad();
                        setPluginNode(instance.renderComponent());
                    } else {
                        console.log("onPluginLoad method not found on the instance");
                    }
                } else if (typeof plugin.default === 'object') {
                    // 如果是对象，直接使用
                    if (typeof plugin.default.onPluginLoad === 'function') {
                        plugin.default.onPluginLoad();
                    } else {
                        console.log("onPluginLoad method not found on the object");
                    }
                } else {
                    console.log("Unexpected default export type");
                }
            } catch (e) {
                console.error(e);
            }

        }

        initPage();
    }, []);

    return (
        <div style={{ backgroundColor: "white", width: "100vw", height: "100vh" }} data-tauri-drag-region>
            {
                pluginNode === null ?
                    <h1>正在加载插件...</h1> :
                    pluginNode
            }
        </div>
    );
};

export default PluginWindow;