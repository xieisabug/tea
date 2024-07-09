import React, { useState } from 'react';
import "./AssistantConfig.css";

interface AssistantConfig {
    model: string;
    max_tokens: number;
    temperature: number;
    top_p: number;
    stream: boolean;
    [key: string]: string | number | boolean;
}

interface Assistant {
    name: string;
    config: AssistantConfig;
}


const AssistantConfig: React.FC = () => {
    const [expanded, setExpanded] = useState(true);
    const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
    const [newParamKey, setNewParamKey] = useState('');
    const [newParamValue, setNewParamValue] = useState('');

    const [assistants, setAssistants] = useState<Assistant[]>([]);

    const onSave = (assistant: Assistant) => {
        console.log(assistant)
    }

    const onAdd = (name: string) => {
        setAssistants([...assistants, { name, config: { model: 'gpt-3.5', max_tokens: 100, temperature: 0.7, top_p: 1.0, stream: false } }]);
    }

    const handleConfigChange = (key: string, value: string | number | boolean) => {
        if (currentAssistant) {
            setCurrentAssistant({
                ...currentAssistant,
                config: { ...currentAssistant.config, [key]: value },
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
                         key={index} onClick={() => setCurrentAssistant(assistant)}>
                        {assistant.name}
                    </div>
                ))}
            </div>
            {currentAssistant && (
                <div className="assistant-config">
                    <h3>
                        {currentAssistant.name}
                        <button className="expand-button" onClick={() => setExpanded(!expanded)}>
                            {expanded ? '▼' : '▲'}
                        </button>
                    </h3>
                    {expanded && (
                        <form>
                            <div className="config-grid">

                                {Object.entries(currentAssistant.config).map(([key, value]) => (
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
                            <button className="save-button" type="button" onClick={handleSave}>设置</button>
                        </form>
                        )}
                </div>
            )}
        </div>
    );
};

export default AssistantConfig;