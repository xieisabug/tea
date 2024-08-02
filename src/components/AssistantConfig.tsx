import React, {useCallback, useEffect, useState} from 'react';
import "../styles/AssistantConfig.css";
import {invoke} from "@tauri-apps/api/tauri";
import RoundButton from './RoundButton';
import IconButton from './IconButton';
import Edit from '../assets/edit.svg';
import Delete from '../assets/delete.svg';
import CustomSelect from './CustomSelect';
import ConfirmDialog from './ConfirmDialog';
import FormDialog from './FormDialog';
import { AssistantDetail, AssistantListItem } from '../data/Assistant';

interface ModelForSelect {
    name: string;
    code: string;
    id: number;
    llm_provider_id: number;
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

            if (assistantList.length) {
                handleChooseAssistant(assistantList[0])
            }
        });
    }, []);
    const onSave = (assistant: AssistantDetail) => {
        return invoke("save_assistant", { assistantDetail: assistant});
    }
    const onAdd = () => {
        invoke<AssistantDetail>("add_assistant").then((assistantDetail: AssistantDetail) => {
            setAssistants([...assistants, { id: assistantDetail.assistant.id, name: assistantDetail.assistant.name }]);
            setCurrentAssistant(assistantDetail);
        });
        // setAssistants([...assistants, { name, prompt: '', model: '', config: { max_tokens: 500, temperature: 0.7, top_p: 1.0, stream: false } }]);
    }

    const handleChooseAssistant = (assistant: AssistantListItem) => {
        if (!currentAssistant || currentAssistant.assistant.id !== assistant.id) {
            invoke<AssistantDetail>("get_assistant", { assistantId: assistant.id }).then((assistant: AssistantDetail) => {
                setCurrentAssistant(assistant);
            });
        }
    }

    const handleConfigChange = (key: string, value: string | boolean, value_type: string) => {
        if (currentAssistant) {
            let index = currentAssistant.model_configs.findIndex((config) => {
                return config.name === key
            });
    
            if (index !== -1) {
                let isValid = true;
                let newValue: string | number | boolean = value;
    
                switch (value_type) {
                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            isValid = false;
                        }
                        break;
                    case 'string':
                        if (typeof value !== 'string') {
                            isValid = false;
                        }
                        break;
                    case 'number':
                        if (typeof value !== 'string') {
                            isValid = false;
                        } else {
                            if (/^\d+$/.test(value)) {
                                let parsedValue = parseInt(value, 10);
                                // 继续处理
                                if (isNaN(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 0) {
                                    isValid = false;
                                }
                            } else if (value === "") {
                                newValue = 0;
                            } else {
                                isValid = false;
                            }
                        }
                        break;
                    case 'float':
                        if (typeof value !== 'string') {
                            isValid = false;
                        } else {
                            // 允许更自由的输入，包括部分完成的小数
                            if (/^-?\d*\.?\d*$/.test(value)) {
                                newValue = value;
                            } else {
                                isValid = false;
                            }
                        }
                        break;
                    default:
                        isValid = false;
                        break;
                }
    
                if (isValid) {
                    setCurrentAssistant({
                        ...currentAssistant,
                        model_configs: [
                            ...currentAssistant.model_configs.slice(0, index),
                            {
                                ...currentAssistant.model_configs[index],
                                value: newValue.toString(),
                            },
                            ...currentAssistant.model_configs.slice(index + 1),
                        ],
                    });
                }
            }
        }
    };

    const handleConfigBlur = (key: string, value: string, value_type: string) => {
        if (currentAssistant) {
            let index = currentAssistant.model_configs.findIndex((config) => {
                return config.name === key
            });
    
            if (index !== -1) {
                let isValid = true;
                let newValue: string | number | boolean = value;
    
                switch (value_type) {
                    case 'number':
                        if (typeof value !== 'string') {
                            isValid = false;
                        } else {
                            if (/^\d+$/.test(value)) {
                                let parsedValue = parseInt(value, 10);
                                // 继续处理
                                if (isNaN(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 0) {
                                    isValid = false;
                                } else {
                                    newValue = parsedValue;
                                }
                            } else if (value === "") {
                                newValue = 0;
                            }
                        }
                        break;
                    case 'float':
                        if (typeof value !== 'string') {
                            isValid = false;
                        } else {
                            // 允许更自由的输入，包括部分完成的小数
                            if (/^-?\d*\.?\d*$/.test(value)) {
                                if (value === '' || value === '-' || value === '.' || value === '-.') {
                                    newValue = 0;
                                } else {
                                    let parsedValue = parseFloat(value);
                                    if (!isNaN(parsedValue) && Number.isFinite(parsedValue)) {
                                        newValue = parsedValue;
                                    }
                                }
                            } else {
                                isValid = false;
                            }
                        }
                        break;
                    default:
                        isValid = false;
                        break;
                }
    
                if (isValid) {
                    setCurrentAssistant({
                        ...currentAssistant,
                        model_configs: [
                            ...currentAssistant.model_configs.slice(0, index),
                            {
                                ...currentAssistant.model_configs[index],
                                value: newValue.toString(),
                            },
                            ...currentAssistant.model_configs.slice(index + 1),
                        ],
                    });
                }
            }
        }
    }

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

    // const [newParamKey, setNewParamKey] = useState('');
    // const [newParamValue, setNewParamValue] = useState('');
    // const handleAddParam = () => {
    //     if (currentAssistant && newParamKey) {
    //         setCurrentAssistant({
    //             ...currentAssistant,
    //             model_configs: [
    //                 ...currentAssistant.model_configs,
    //                 {
    //                     id: 0,
    //                     assistant_id: currentAssistant.assistant.id,
    //                     name: newParamKey,
    //                     value: newParamValue,
    //                 },
    //             ]
    //         });
    //         setNewParamKey('');
    //         setNewParamValue('');
    //     }
    // };

    // 删除助手
    const [confirmDialogIsOpen, setConfirmDialogIsOpen] = useState<boolean>(false);
    const closeConfirmDialog = useCallback(() => {
        setConfirmDialogIsOpen(false);
    }, []);
    const openConfigDialog = useCallback(() => {
        setConfirmDialogIsOpen(true);
    }, []);
    const handleDelete = useCallback(() => {
        if (currentAssistant) {
            invoke("delete_assistant", { assistantId: currentAssistant.assistant.id }).then(() => {
                const newAssistants = assistants.filter((assistant) => assistant.id !== currentAssistant.assistant.id);
                setAssistants(newAssistants);
                if (newAssistants.length > 0) {
                    handleChooseAssistant(newAssistants[0]);
                } else {
                    setCurrentAssistant(null);
                }
                setConfirmDialogIsOpen(false);
                // 展示一个tips
            });
        }
    }, [currentAssistant, assistants]);

    // 修改助手名称与描述
    const [formDialogIsOpen, setFormDialogIsOpen] = useState<boolean>(false);
    const openFormDialog = useCallback(() => {
        setFormAssistantName(currentAssistant?.assistant.name || "");
        setFormAssistantDescription(currentAssistant?.assistant.description || "");
        setFormDialogIsOpen(true);
    }, [currentAssistant]);
    const closeFormDialog = useCallback(() => {
        setFormDialogIsOpen(false);
    }, []);
    const [formAssistantName, setFormAssistantName] = useState<string>("");
    const [formAssistantDescription, setFormAssistantDescription] = useState<string>("");
    const handleFormSubmit = useCallback(() => {
        if (currentAssistant) {
            const newCurrentAssistant = {
                ...currentAssistant,
                assistant: {
                    ...currentAssistant.assistant,
                    name: formAssistantName,
                    description: formAssistantDescription,
                },
            };
            onSave(newCurrentAssistant).then(() => {
                setCurrentAssistant(newCurrentAssistant);
                setFormDialogIsOpen(false);
                const index = assistants.findIndex((assistant) => assistant.id === currentAssistant.assistant.id);
                if (index >= 0) {
                    const newAssistants = [...assistants];
                    newAssistants[index] = { id: currentAssistant.assistant.id, name: formAssistantName };
                    setAssistants(newAssistants);
                }
            })
        }
    }, [currentAssistant, formAssistantName, formAssistantDescription]);

    return (
        <div className="assistant-editor">
            <div className="assistant-list">
                {assistants.map((assistant, index) => (
                    <RoundButton 
                        key={index} 
                        text={assistant.name} 
                        onClick={() => handleChooseAssistant(assistant)} 
                        primary={currentAssistant?.assistant.id === assistant.id} 
                        className='assistant-button'
                    />
                ))}
                <RoundButton text='新增' onClick={onAdd} />

            </div>
            {currentAssistant && (
                <div className="config-window-container">
                    <div className='config-window-title'>
                        <div className='config-window-title-text-container'>
                            <span className='config-window-title-name'>{currentAssistant.assistant.name}</span>
                            <span className='config-window-title-description'>{currentAssistant.assistant.description}</span>    
                        </div>
                        <div className='config-window-icon-button-group'>
                            <IconButton icon={Delete} onClick={openConfigDialog} />
                            <IconButton icon={Edit} onClick={openFormDialog} />
                        </div>
                    </div>
                    <form className='config-window-form'>
                        <div className='form-group'>
                            <label>助手类型</label>
                            <div>对话</div>
                        </div>
                        <div className="assistant-config-grid">
                            
                            <div className='assistant-config-properties'>
                                <div className='form-group'>
                                    <label>model</label>
                                    <CustomSelect 
                                        options={models.map(i => ({value: i.code + "/" + i.llm_provider_id, label: i.name}))} 
                                        value={currentAssistant.model.length > 0 ? currentAssistant.model[0].model_code + "/" + currentAssistant.model[0].provider_id: "-1"} 
                                        onChange={(v) => {
                                            const [modelCode, providerId] = v.split("/");
                                            if (currentAssistant?.model.length > 0) {
                                                setCurrentAssistant({
                                                    ...currentAssistant,
                                                    model: [{...currentAssistant?.model[0], model_code: modelCode, provider_id: parseInt(providerId)}]
                                                })
                                            } else {
                                                setCurrentAssistant({
                                                    ...currentAssistant,
                                                    model: [{id: 0, assistant_id: currentAssistant.assistant.id, model_code: modelCode, provider_id: parseInt(providerId), alias: ''}]
                                                })
                                            }
                                        }} 
                                    />
                                </div>
                                {(currentAssistant.model_configs || []).map(config => (
                                    <div className='form-group' key={config.name}>
                                        <label>{config.name}</label>
                                        <input
                                            className='form-input'
                                            type={config.value_type === 'boolean' ? 'checkbox' : 'text'}
                                            value={config.value}
                                            checked={config.value === 'true'}
                                            onChange={(e) => handleConfigChange(config.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value, config.value_type)}
                                            onFocus={(e) => e.target.select()}
                                            onBlur={(e) => handleConfigBlur(config.name, e.target.value, config.value_type)}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            
                            {/* <div className="form-group">
                                <input
                                    className='form-input'
                                    type="text"
                                    placeholder="新参数名"
                                    value={newParamKey}
                                    onChange={(e) => setNewParamKey(e.target.value)}
                                />
                                <input
                                    className='form-input'
                                    type="text"
                                    placeholder="新参数值"
                                    value={newParamValue}
                                    onChange={(e) => setNewParamValue(e.target.value)}
                                />
                                <CustomSelect options={[{value: "query", label: "query"}, {value: "header", label: "header"}]} value={"header"} onChange={(v) => {}} />
                                <button type="button" onClick={handleAddParam}>添加参数</button>
                            </div> */}
                            <div className='assistant-config-prompts'>
                                <div>prompt</div>
                                <textarea 
                                    className='form-textarea assistant-config-prompt-textarea'
                                    value={currentAssistant.prompts[0].prompt}
                                    onChange={(e) => handlePromptChange(e.target.value)}></textarea>

                            </div>
                        </div>
                        <div>
                            <RoundButton primary text='保存' onClick={handleSave} />
                        </div>
                    </form>

                </div>
            )}
            <ConfirmDialog
                title="确认操作"
                confirmText="该操作不可逆，确认执行删除助手操作吗？删除后，配置将会删除，并且该助手的对话将转移到 快速使用助手 ，且不可恢复。"
                onConfirm={() => {
                    handleDelete();
                }}
                onCancel={closeConfirmDialog}
                isOpen={confirmDialogIsOpen}
            />
            <FormDialog
                title={"修改助手 : " + currentAssistant?.assistant.name}
                onSubmit={handleFormSubmit}
                onClose={closeFormDialog}
                isOpen={formDialogIsOpen}
            >
                <form className='form-group-container'>
                    <div className='form-group'>
                        <label>名称:</label>
                        <input className='form-input' type="text" name="name" value={formAssistantName} onChange={e => setFormAssistantName(e.target.value)} />
                    </div>
                    <div className='form-group'>
                        <label>描述:</label>
                        <input className='form-input' type="text" name="description" value={formAssistantDescription} onChange={e => setFormAssistantDescription(e.target.value)}/>
                    </div>
                </form>
            </FormDialog>
        </div>
    );
};

export default AssistantConfig;