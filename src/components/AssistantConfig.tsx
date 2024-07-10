import React, {useEffect, useState} from 'react';
import "./AssistantConfig.css";
import {invoke} from "@tauri-apps/api/tauri";

interface AssistantConfig {
    max_tokens: number;
    temperature: number;
    top_p: number;
    stream: boolean;
    [key: string]: string | number | boolean;
}

interface Assistant {
    name: string;
    config: AssistantConfig;
    model: string;
    prompt: string;
}

interface ModelForSelect {
    name: string;
    code: string;
    id: number;
    llmProviderId: number;
}

const AssistantConfig: React.FC = () => {
    // 基础数据
    // 模型数据
    const [models, setModels] = useState<ModelForSelect[]>([]);
    useEffect(() => {
        invoke<Array<ModelForSelect>>("get_models_for_select").then((modelList) => {
            setModels(modelList);
        });
    }, []);

    const [expanded, setExpanded] = useState(true);
    const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
    const [newParamKey, setNewParamKey] = useState('');
    const [newParamValue, setNewParamValue] = useState('');

    // 助手相关
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    useEffect(() => {
        invoke<Array<Assistant>>("get_assistants").then((assistantList) => {
            setAssistants(assistantList);
        });
    }, []);
    const onSave = (assistant: Assistant) => {
        console.log(assistant)
    }
    const onAdd = (name: string) => {
        setAssistants([...assistants, { name, prompt: '', model: '', config: { max_tokens: 500, temperature: 0.7, top_p: 1.0, stream: false } }]);
    }

    const handleChooseAssistant = (assistant: Assistant) => {
        if (currentAssistant === assistant) {
            setExpanded(!expanded);
        } else {
            setCurrentAssistant(assistant);
            setExpanded(true);
        }
    }

    const handleConfigChange = (key: string, value: string | number | boolean) => {
        if (currentAssistant) {
            setCurrentAssistant({
                ...currentAssistant,
                config: { ...currentAssistant.config, [key]: value },
            });
        }
    };

    const handlePromptChange = (value: string) => {
        if (currentAssistant) {
            setCurrentAssistant({
                ...currentAssistant,
                prompt: value,
            });
        }
    };

    const handleSave = () => {
        if (currentAssistant) {
            onSave(currentAssistant);
        }
    };

    const handleAddParam = () => {
        if (currentAssistant && newParamKey) {
            setCurrentAssistant({
                ...currentAssistant,
                config: { ...currentAssistant.config, [newParamKey]: newParamValue },
            });
            setNewParamKey('');
            setNewParamValue('');
        }
    };

    const handleAddAssistant = () => {
        const name = "Temp Assistant";
        if (name) {
            onAdd(name);
        }
    };

    return (
        <div className="assistant-editor">
            <h2>助手列表</h2>
            <button className="add-button" onClick={handleAddAssistant}>添加</button>
            <div className="assistant-list">
                {assistants.map((assistant, index) => (
                    <div className={`assistant-item ${currentAssistant?.name === assistant.name ? 'active' : ''}`}
                         key={index} onClick={() => handleChooseAssistant(assistant)}>
                        {assistant.name}

                        <span className="expand-button">
                            {expanded ? '▼' : '▲'}
                        </span>
                    </div>
                ))}
            </div>
            {currentAssistant && (
                <div className="assistant-config">
                    {expanded && (
                        <form>
                            <div className="config-grid">

                                <div>
                                    <span>Model</span>
                                    <select value={currentAssistant.model} onChange={(e) => setCurrentAssistant({ ...currentAssistant, model: e.target.value })}>
                                        <option value="">请选择模型</option>
                                        {models.map((model) => (
                                            <option key={model.id} value={model.code}>{model.name}</option>
                                        ))}
                                    </select>
                                    {Object.entries(currentAssistant.config || []).map(([key, value]) => (
                                        <div className="config-item" key={key}>
                                            <label>{key}</label>
                                            <input
                                                type={typeof value === 'boolean' ? 'checkbox' : 'text'}
                                                value={value.toString()}
                                                checked={typeof value === 'boolean' ? value : undefined}
                                                onChange={(e) => handleConfigChange(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <div className="config-item">
                                        <input
                                            type="text"
                                            placeholder="新参数名"
                                            value={newParamKey}
                                            onChange={(e) => setNewParamKey(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="新参数值"
                                            value={newParamValue}
                                            onChange={(e) => setNewParamValue(e.target.value)}
                                        />
                                        <button type="button" onClick={handleAddParam}>添加参数</button>
                                    </div>
                                </div>
                                <div>
                                    <span>Prompt</span>
                                    <textarea value={currentAssistant.prompt}
                                              onChange={(e) => handlePromptChange(e.target.value)}></textarea>
                                    <button className="save-button" type="button" onClick={handleSave}>保存</button>

                                </div>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssistantConfig;