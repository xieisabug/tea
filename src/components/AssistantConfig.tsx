import React, {useEffect, useState} from 'react';
import "./AssistantConfig.css";
import {invoke} from "@tauri-apps/api/tauri";

interface AssistantListItem {
    id: number;
    name: string;
}

interface Assistant {
    id: number;
    name: string;
    description: string | null;
    assistant_type: number; // 0: 普通对话助手, 1: 多模型对比助手，2: 工作流助手，3: 展示助手
    is_addition: boolean;
    created_time: string;
}

interface AssistantModel {
    id: number;
    assistant_id: number;
    model_id: string;
    alias: string;
}

interface AssistantPrompt {
    id: number;
    assistant_id: number;
    prompt: string;
    created_time: string;
}

interface AssistantModelConfig {
    id: number;
    assistant_id: number;
    name: string;
    value: string;
}

interface AssistantPromptParam {
    id: number;
    assistant_id: number;
    assistant_prompt_id: number;
    param_name: string;
    param_type: string;
    param_value: string | null;
}

interface AssistantDetail {
    assistant: Assistant;
    prompts: AssistantPrompt[];
    model: AssistantModel[];
    model_configs: AssistantModelConfig[];
    prompt_params: AssistantPromptParam[];
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

    const [currentAssistant, setCurrentAssistant] = useState<AssistantDetail | null>(null);

    // 助手相关
    const [assistants, setAssistants] = useState<AssistantListItem[]>([]);
    useEffect(() => {
        invoke<Array<AssistantListItem>>("get_assistants").then((assistantList) => {
            setAssistants(assistantList);
        });
    }, []);
    const onSave = (assistant: AssistantDetail) => {
        invoke("save_assistant", { assistantDetail: assistant}).then(() => {

        });
    }
    const onAdd = (name: string) => {
        console.log(name)
        // setAssistants([...assistants, { name, prompt: '', model: '', config: { max_tokens: 500, temperature: 0.7, top_p: 1.0, stream: false } }]);
    }

    const [expanded, setExpanded] = useState(true);
    const handleChooseAssistant = (assistant: AssistantListItem) => {
        if (currentAssistant && currentAssistant.assistant.id === assistant.id) {
            setExpanded(!expanded);
        } else {
            invoke<AssistantDetail>("get_assistant", { assistantId: assistant.id }).then((assistant: AssistantDetail) => {
                setCurrentAssistant(assistant);
                setExpanded(true);
            });
        }
    }

    const handleConfigChange = (key: string, value: string | number | boolean) => {
        if (currentAssistant) {
            let index = currentAssistant.model_configs.findIndex((config) => {
                return config.name === key
            })

            setCurrentAssistant({
                ...currentAssistant,
                model_configs: [
                    ...currentAssistant.model_configs.slice(0, index),
                    {
                        ...currentAssistant.model_configs[index],
                        value: value.toString(),
                    },
                    ...currentAssistant.model_configs.slice(index + 1),
                ],
            })
        }
    };

    const handlePromptChange = (value: string) => {
        if (currentAssistant) {
            setCurrentAssistant({
                ...currentAssistant,
                prompts: [
                    {
                        ...currentAssistant.prompts[0],
                        prompt: value,
                    },
                ],
            });
        }
    };

    const handleSave = () => {
        if (currentAssistant) {
            onSave(currentAssistant);
        }
    };

    const [newParamKey, setNewParamKey] = useState('');
    const [newParamValue, setNewParamValue] = useState('');
    const handleAddParam = () => {
        if (currentAssistant && newParamKey) {
            setCurrentAssistant({
                ...currentAssistant,
                model_configs: [
                    ...currentAssistant.model_configs,
                    {
                        id: 0,
                        assistant_id: currentAssistant.assistant.id,
                        name: newParamKey,
                        value: newParamValue,
                    },
                ]
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
                    <div className={`assistant-item ${currentAssistant?.assistant.id === assistant.id ? 'active' : ''}`}
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
                                    <select value={currentAssistant.model.length > 0 ? currentAssistant.model[0].model_id: -1}
                                            onChange={(e) => {
                                                if (currentAssistant?.model.length > 0) {
                                                    setCurrentAssistant({
                                                        ...currentAssistant,
                                                        model: [{...currentAssistant?.model[0], model_id: e.target.value}]
                                                    })
                                                } else {
                                                    setCurrentAssistant({
                                                        ...currentAssistant,
                                                        model: [{id: 0, assistant_id: currentAssistant.assistant.id, model_id: e.target.value, alias: ''}]
                                                    })
                                                }
                                            }
                                    }>
                                        <option value="">请选择模型</option>
                                        {models.map((model) => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                    </select>
                                    {(currentAssistant.model_configs || []).map(config => (
                                        <div className="config-item" key={config.name}>
                                            <label>{config.name}</label>
                                            <input
                                                type={config.value === 'true' || config.value === 'false' ? 'checkbox' : 'text'}
                                                value={config.value}
                                                checked={config.value === 'true'}
                                                onChange={(e) => handleConfigChange(config.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value)}
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
                                    <textarea value={currentAssistant.prompts[0].prompt}
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