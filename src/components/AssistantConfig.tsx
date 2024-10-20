import React, { useCallback, useEffect, useState } from 'react';
import "../styles/AssistantConfig.css";
import { invoke } from "@tauri-apps/api/tauri";
import ConfirmDialog from './ConfirmDialog';
import FormDialog from './FormDialog';
import { AssistantDetail, AssistantListItem } from '../data/Assistant';
import { emit } from '@tauri-apps/api/event';
import { Button } from './ui/button';
import ConfigForm from './ConfigForm';

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
        invoke<Array<ModelForSelect>>("get_models_for_select")
            .then(setModels)
            .catch((error) => {
                console.error("获取模型列表失败:", error);
                // 可以显示一个错误提示给用户
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
        return invoke("save_assistant", { assistantDetail: assistant });
    }
    const onAdd = () => {
        invoke<AssistantDetail>("add_assistant").then((assistantDetail: AssistantDetail) => {
            setAssistants((prev) => [...prev, { id: assistantDetail.assistant.id, name: assistantDetail.assistant.name }]);
            setCurrentAssistant(assistantDetail);
        });
    }
    const onCopy = (assistantId: number) => {
        invoke<AssistantDetail>("copy_assistant", { assistantId }).then((assistantDetail: AssistantDetail) => {
            setAssistants((prev) => [...prev, { id: assistantDetail.assistant.id, name: assistantDetail.assistant.name }]);
            setCurrentAssistant(assistantDetail);
        });
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
            const index = currentAssistant.model_configs.findIndex(config => config.name === key);
            if (index !== -1) {
                console.log("键", key, "值", value, "值类型", value_type);
                const { isValid, parsedValue } = validateConfig(value, value_type);
                console.log("验证结果：", isValid ? "有效" : "无效", "解析后的值：", parsedValue);

                if (isValid) {
                    setCurrentAssistant({
                        ...currentAssistant,
                        model_configs: currentAssistant.model_configs.map((config, i) =>
                            i === index ? { ...config, value: parsedValue.toString() } : config
                        ),
                    });
                }
            }
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
            onSave(currentAssistant)
                .then(() => {
                    emit('config-window-success-notification');
                })
                .catch((error) => {
                    emit('config-window-alert-dialog', {
                        text: '保存失败: ' + error,
                        type: 'error'
                    });
                });
        }
    };

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
                emit('config-window-success-notification');
            }).catch((error) => {
                emit('config-window-alert-dialog', {
                    text: '修改助手名称与描述失败: ' + error,
                    type: 'error'
                });
            });
        }
    }, [currentAssistant, formAssistantName, formAssistantDescription]);

    const assistantFormConfig = {
        model: {
            type: "select" as const,
            label: "Model",
            options: models.map((m) => ({
                value: `${m.code}%%${m.llm_provider_id}`,
                label: m.name,
            })),
            value: currentAssistant?.model.length ?? 0 > 0 ? `${currentAssistant?.model[0].model_code}%%${currentAssistant?.model[0].provider_id}` : "-1",
            onChange: (value: string | boolean) => {
                const [modelCode, providerId] = (value as string).split("%%");
                console.log("model code", modelCode, "provider id", providerId, "current assistant", currentAssistant);
                if (currentAssistant?.model.length ?? 0 > 0) {
                    let assistant = currentAssistant as AssistantDetail;
                    setCurrentAssistant({
                        ...assistant,
                        model: [{
                            ...assistant?.model[0],
                            model_code: modelCode,
                            provider_id: parseInt(providerId),
                        }]
                    })
                } else {
                    let assistant = currentAssistant as AssistantDetail;
                    setCurrentAssistant({
                        ...assistant,
                        model: [{ id: 0, assistant_id: assistant.assistant.id, model_code: modelCode, provider_id: parseInt(providerId), alias: '' }]
                    })
                }
            },
        },
        ...currentAssistant?.model_configs.reduce((acc, config) => {
            acc[config.name] = {
                type: config.value_type === 'boolean' ? "checkbox" as const : "input" as const,
                label: config.name,
                value: config.value_type === 'boolean' ? config.value == "true" : config.value,
                onChange: (value: string | boolean) => handleConfigChange(config.name, value, config.value_type),
                onBlur: (value: string | boolean) => handleConfigChange(config.name, value as string, config.value_type),
            };
            return acc;
        }, {} as Record<string, any>),
        prompt: {
            type: "textarea" as const,
            label: "Prompt",
            value: currentAssistant?.prompts[0].prompt ?? "",
            onChange: (value: string | boolean) => handlePromptChange(value as string),
        },
    };

    const validateConfig = (value: any, type: string): { isValid: boolean, parsedValue: any } => {
        let isValid = true;
        let parsedValue = value;

        switch (type) {
            case 'boolean':
                isValid = typeof value === 'boolean';
                break;
            case 'string':
                isValid = typeof value === 'string';
                break;
            case 'number':
                if (typeof value !== 'string') {
                    isValid = false;
                } else if (/^\d+$/.test(value)) {
                    const num = parseInt(value, 10);
                    isValid = !isNaN(num) && Number.isInteger(num) && num >= 0;
                    parsedValue = isValid ? num : value;
                } else if (value === "") {
                    parsedValue = 0;
                } else {
                    isValid = false;
                }
                break;
            case 'float':
                if (typeof value !== 'string') {
                    isValid = false;
                } else {
                    isValid = /^-?\d*\.?\d*$/.test(value);
                }
                break;
            default:
                isValid = false;
        }

        return { isValid, parsedValue };
    };

    return (
        <div className="assistant-editor">
            <div className="flex flex-wrap gap-4 mb-4">
                {assistants.map((assistant, index) => (
                    <Button
                        key={index}
                        variant={currentAssistant?.assistant.id === assistant.id ? "default" : "outline"}
                        onClick={() => handleChooseAssistant(assistant)}
                        className=''
                    >{assistant.name}</Button>
                ))}

                <Button onClick={onAdd}>新增</Button>
            </div>
            {currentAssistant && (
                <ConfigForm
                    title={currentAssistant.assistant.name}
                    description={currentAssistant.assistant.description ? currentAssistant.assistant.description : ""}
                    config={assistantFormConfig}
                    layout="prompt"
                    classNames="bottom-space"
                    onSave={handleSave}
                    onCopy={() => onCopy(currentAssistant.assistant.id)}
                    onDelete={openConfigDialog}
                    onEdit={openFormDialog}
                />
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
                        <input className='form-input' type="text" name="description" value={formAssistantDescription} onChange={e => setFormAssistantDescription(e.target.value)} />
                    </div>
                </form>
            </FormDialog>
        </div>
    );
};

export default AssistantConfig;
