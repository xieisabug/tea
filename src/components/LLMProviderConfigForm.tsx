import React, {useEffect, useState} from 'react';
import './LLMProviderConfig.css';
import {invoke} from "@tauri-apps/api/tauri";

// Define an interface for the component props
interface LLMProviderConfigFormProps {
    id: string; // Add the id prop
}

interface LLMProviderConfig {
    name: string;
    value: string;
    append_location: string;
    is_addition: boolean;
}

const LLMProviderConfigForm: React.FC<LLMProviderConfigFormProps> = ( {id} ) => {
    const [endpoint, setEndpoint] = useState<string>('');
    const [modelList, setModelList] = useState<string>('');
    const [apiKey, setApiKey] = useState<string>('');

    useEffect(() => {
        invoke<Array<LLMProviderConfig>>('get_llm_provider_config', { id: id })
            .then((configArray) => {
                configArray.forEach((config) => {
                    switch (config.name) {
                        case 'endpoint':
                            setEndpoint(config.value);
                            break;
                        case 'model_list':
                            setModelList(config.value);
                            break;
                        case 'api_key':
                            setApiKey(config.value);
                            break;
                        default:
                            break;
                    }
                });
            })

    }, []);

    const getModelList = async () => {

    }

    return (
        <div className="provider-config">
            <div className="form-group">
                <label>Endpoint:</label>
                <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>API Key:</label>
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Model List:</label>
                <button onClick={getModelList}>获取</button>
                <input
                    type="text"
                    value={modelList}
                    onChange={(e) => setModelList(e.target.value)}
                />
            </div>
        </div>
    );
}

export default LLMProviderConfigForm;
