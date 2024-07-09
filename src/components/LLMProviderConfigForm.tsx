import React, { useEffect, useState, useCallback } from 'react';
import './LLMProviderConfig.css';
import { invoke } from "@tauri-apps/api/tauri";
import debounce from 'lodash/debounce';
import TagInput from "./TagInput.tsx";

interface LLMProviderConfigFormProps {
    id: string;
}

interface LLMProviderConfig {
    name: string;
    value: string;
    append_location: string;
    is_addition: boolean;
}

interface LLMModel {
    id: number;
    name: string;
    llmProviderId: number;
    code: string;
    description: string;
    visionSupport: boolean;
    audioSupport: boolean;
    videoSupport: boolean;
}

const LLMProviderConfigForm: React.FC<LLMProviderConfigFormProps> = ({ id }) => {
    const [config, setConfig] = useState<Record<string, string>>({
        endpoint: '',
        api_key: '',
    });

    useEffect(() => {
        invoke<Array<LLMProviderConfig>>('get_llm_provider_config', { id })
            .then((configArray) => {
                console.log(configArray)
                const newConfig: Record<string, string> = {};
                configArray.forEach((item) => {
                    newConfig[item.name] = item.value;
                });
                setConfig(newConfig);
            });
    }, [id]);

    const updateField = useCallback(
        debounce((key: string, value: string) => {
            invoke('update_llm_provider_config', { llmProviderId: id, name: key, value })
                .then(() => console.log(`Field ${key} updated`))
                .catch((error) => console.error(`Error updating field ${key}:`, error));
        }, 50),
        [id]
    );

    const handleInputChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        updateField(key, value);
    };

    const fetchModelList = async () => {
        invoke<Array<LLMModel>>('fetch_model_list', { llmProviderId: id })
            .then((modelList) => {
                setTags(modelList.map((model) => model.name));
            });
    };

    const [tags, setTags] = useState<string[]>([]);
    useEffect(() => {
        invoke<Array<LLMModel>>('get_llm_models', { llmProviderId: '' + id })
            .then((modelList) => {
                setTags(modelList.map((model) => model.name));
            });
    }, [id]);
    const handleAddTag = (tag: string) => {
        setTags([...tags, tag]);
    };
    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    return (
        <div className="provider-config">
            <div className="form-group">
                <label>Endpoint:</label>
                <input
                    type="text"
                    value={config.endpoint || ''}
                    onChange={(e) => handleInputChange('endpoint', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>API Key:</label>
                <input
                    type="text"
                    value={config.api_key || ''}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Model List:</label>
                <button onClick={fetchModelList}>获取</button>
                <TagInput
                    tags={tags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag}
                />
            </div>
        </div>
    );
};

export default LLMProviderConfigForm;
