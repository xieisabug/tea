import React, {useEffect, useState} from 'react';
import '../styles/LLMProviderConfig.css';
import {invoke} from "@tauri-apps/api/tauri";
import LLMProviderConfigForm from "./LLMProviderConfigForm.tsx";
import RoundButton from './RoundButton.tsx';

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


    return (
        <div className="model-config">
            {
                LLMProviders.map((provider, index) => {
                    return <div className='config-window-container provider-config-window' key={index}>
                        <div className='config-window-title'>
                            <div className='config-window-title-text-container'>
                                <span className='config-window-title-name'>{provider.name}</span>
                            </div>
                            
                            <label>
                                启用:
                                <input
                                    type="checkbox"
                                    checked={provider.is_enabled}
                                    onChange={() => handleToggle(index)}
                                />
                            </label>
                            <span>toggle</span>
                        </div>

                        <LLMProviderConfigForm id={provider.id} apiType={provider.api_type}/>
                    </div>
                })
            }
            <RoundButton text='新增' onClick={() => {}} />
        </div>
    );
}

export default LLMProviderConfig;
