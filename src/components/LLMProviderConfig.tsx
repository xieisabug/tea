import React, {useEffect, useState} from 'react';
import './LLMProviderConfig.css';
import {invoke} from "@tauri-apps/api/tauri";
import LLMProviderConfigForm from "./LLMProviderConfigForm.tsx";

interface LLMProvider {
    id: string;
    name: string;
    api_type: string;
    description: string;
    is_official: boolean;
    is_enabled: boolean;
}

const LLMProviderConfig: React.FC = () => {
    const [LLMProviders, setLLMProviders] = useState<Array<LLMProvider>>([]);
    const [configFormShow, setConfigFormShow] = useState<boolean>(false);
    const [configFormId, setConfigFormId] = useState<string>('');

    const handleToggle = (index: number) => {
        const newProviders = [...LLMProviders];
        newProviders[index].is_enabled = !newProviders[index].is_enabled;
        setLLMProviders(newProviders);
        console.log(LLMProviders[index])

        invoke('update_llm_provider', {
            id: LLMProviders[index].id,
            name: LLMProviders[index].name,
            apiType: LLMProviders[index].api_type,
            description: LLMProviders[index].description,
            isEnabled: newProviders[index].is_enabled
        });
    };

    useEffect(() => {
        invoke<Array<LLMProvider>>('get_llm_providers').then(setLLMProviders);
    }, []);

    const collapseConfigForm = (id: string) => {
        setConfigFormShow(!configFormShow);
        setConfigFormId(id)
    }

    return (
        <div className="model-config">
            <h2>大模型配置</h2>
            <div className="providers-grid">
                {LLMProviders.map((provider, index) => (
                    <div key={provider.name} className="provider-item">
                        <label>
                            {provider.name} 启用:
                            <input
                                type="checkbox"
                                checked={provider.is_enabled}
                                onChange={() => handleToggle(index)}
                            />
                        </label>
                        {provider.is_enabled && <button onClick={() => collapseConfigForm(provider.id)}>设置</button>}
                    </div>
                ))}
            </div>

            {
                configFormShow && <LLMProviderConfigForm id={configFormId}/>
            }
        </div>
    );
}

export default LLMProviderConfig;
