import React, { useEffect, useState, useCallback } from 'react';
import '../styles/LLMProviderConfig.css';
import { invoke } from "@tauri-apps/api/tauri";
import debounce from 'lodash/debounce';
import TagInput from "./TagInput.tsx";
import RoundButton from './RoundButton.tsx';
import { emit } from '@tauri-apps/api/event';
import ConfigForm from './ConfigForm.tsx';
import { Switch } from './ui/switch.tsx';

interface LLMProviderConfigFormProps {
    index: number;
    id: string;
    apiType: string;
    name: string;
    isOffical: boolean;
    enabled: boolean;
    onToggleEnabled: any;
    onDelete: any;
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

const LLMProviderConfigForm: React.FC<LLMProviderConfigFormProps> = ({ id, index, apiType, name, isOffical, enabled, onDelete, onToggleEnabled }) => {
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
        console.log('fetch model list');
        invoke<Array<LLMModel>>('fetch_model_list', { llmProviderId: id })
            .then((modelList) => {
                setTags(modelList.map((model) => model.name));
                emit('config-window-success-notification');
            })
            .catch((e) => {
                emit('config-window-alert-dialog', {
                    text: '获取模型列表失败，请检查Endpoint和Api Key配置: ' + e,
                    type: 'error'
                });
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
        invoke<Array<LLMModel>>('add_llm_model', { code: tag, llmProviderId: id })
            .then(() => {
                setTags([...tags, tag]);
            });
    };
    const handleRemoveTag = (index: number) => {
        invoke<Array<LLMModel>>('delete_llm_model', { code: tags[index], llmProviderId: id })
            .then(() => {
                setTags(tags.filter((_, i) => i !== index));
            });
    };

    const configFields = {
        apiType: {
            type: 'static' as const,
            label: 'API类型',
            value: apiType,
        },
        endpoint: {
            type: 'input' as const,
            label: 'Endpoint',
            value: config.endpoint || '',
            onChange: (value: string | boolean) => handleInputChange('endpoint', value as string),
        },
        api_key: {
            type: 'password' as const,
            label: 'API Key',
            value: config.api_key || '',
            onChange: (value: string | boolean) => handleInputChange('api_key', value as string),
        },
        fetchModelList: {
            type: 'button' as const,
            label: '',
            value: '获取Model列表',
            customRender: () => <RoundButton text='获取Model列表' onClick={fetchModelList} />,
        },
        tagInput: {
            type: 'custom' as const,
            label: '模型列表',
            value: '',
            customRender: () => (
                <TagInput
                    placeholder='输入自定义Model按回车确认'
                    tags={tags}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                />
            ),
        },
    };

    return (
        <ConfigForm
            key={id}
            title={name}
            config={configFields}
            classNames="bottom-space"
            onDelete={isOffical ? undefined : () => onDelete(id)}
            extraButtons={
                <Switch checked={enabled} onCheckedChange={() => onToggleEnabled(index)} />
            }
        />
    );
};

export default LLMProviderConfigForm;
