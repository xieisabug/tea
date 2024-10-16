import React, { useCallback, useEffect, useState } from 'react';
import '../styles/LLMProviderConfig.css';
import { invoke } from "@tauri-apps/api/tauri";
import LLMProviderConfigForm from "./LLMProviderConfigForm.tsx";
import RoundButton from './RoundButton.tsx';
import Switch from './Switch.tsx';
import { emit } from '@tauri-apps/api/event';
import FormDialog from './FormDialog.tsx';
import CustomSelect from './CustomSelect.tsx';
import IconButton from './IconButton.tsx';
import Delete from "../assets/delete.svg?react";
import ConfirmDialog from './ConfirmDialog.tsx';
import { Button } from './ui/button.tsx';
import ConfigForm from './ConfigForm.tsx';

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

        invoke('update_llm_provider', {
            id: LLMProviders[index].id,
            name: LLMProviders[index].name,
            apiType: LLMProviders[index].api_type,
            description: LLMProviders[index].description,
            isEnabled: newProviders[index].is_enabled
        });
    };

    const getLLMProviderList = useCallback(() => {
        invoke<Array<LLMProvider>>('get_llm_providers')
            .then(setLLMProviders)
            .catch((e) => {
                emit('config-window-alert-dialog', {
                    text: '获取大模型提供商失败: ' + e,
                    type: 'error'
                });
            });
    }, []);
    useEffect(() => {
        getLLMProviderList();
    }, []);

    const [newProviderDialogOpen, setNewProviderDialogOpen] = useState(false);
    const [providerName, setProviderName] = useState('');
    const [formApiType, setFormApiType] = useState('openai_api');
    const apiTypes = [
        { value: 'openai_api', label: 'OpenAI API' },
        { value: 'ollama', label: 'Ollama API' },
        { value: 'anthropic', label: 'Anthropic API' },
        { value: 'cohere', label: 'Cohere API' },
    ]

    const openNewProviderDialog = useCallback(() => {
        setNewProviderDialogOpen(true);
    }, []);
    const closeNewProviderDialog = useCallback(() => {
        setNewProviderDialogOpen(false);
    }, []);

    const handleNewProviderSubmit = () => {
        invoke('add_llm_provider', {
            name: providerName,
            apiType: formApiType
        }).then(() => {
            emit('config-window-success-notification');
            setProviderName('');
            setFormApiType('openai_api');
            closeNewProviderDialog();

            getLLMProviderList();
        }).catch((e) => {
            emit('config-window-alert-dialog', {
                text: '添加大模型提供商失败: ' + e,
                type: 'error'
            });
        });
    }

    const [confirmDialogIsOpen, setConfirmDialogIsOpen] = useState(false);
    const [deleteLLMProviderId, setDeleteLLMProviderId] = useState("");
    const onConfirmDeleteProvider = useCallback(() => {
        if (!deleteLLMProviderId) {
            return;
        }
        invoke('delete_llm_provider', { llmProviderId: deleteLLMProviderId }).then(() => {
            emit('config-window-success-notification');
            getLLMProviderList();
        })
            .catch(e => {
                emit('config-window-alert-dialog', {
                    text: '删除失败: ' + e,
                    type: 'error'
                });
            })
            .finally(() => {
                closeConfirmDialog();
            })
    }, [deleteLLMProviderId]);
    const openConfirmDialog = (LLMPRoviderId: string) => {
        setConfirmDialogIsOpen(true)
        setDeleteLLMProviderId(LLMPRoviderId);
    }
    const closeConfirmDialog = useCallback(() => {
        setConfirmDialogIsOpen(false)
    }, []);

    const summaryFormConfig = {
        model: {
            type: "static" as const,
            label: "Model",
            value: "test"
        },
    };

    return (
        <div className="model-config">
            {
                LLMProviders.map((provider, index) => {
                    return <LLMProviderConfigForm
                        id={provider.id}
                        index={index}
                        apiType={provider.api_type}
                        name={provider.name}
                        isOffical={provider.is_official}
                        enabled={provider.is_enabled}
                        onToggleEnabled={handleToggle}
                        onDelete={openConfirmDialog}
                    />
                })
            }
            <FormDialog title='新增大模型提供商' isOpen={newProviderDialogOpen} onClose={closeNewProviderDialog} onSubmit={handleNewProviderSubmit}>
                <form className='form-group-container'>
                    <div className='form-group'>
                        <label>名称:</label>
                        <input className='form-input' type="text" name="name" value={providerName} onChange={e => setProviderName(e.target.value)} />
                    </div>
                    <div className='form-group'>
                        <label>API调用类型:</label>
                        <CustomSelect options={apiTypes} value={formApiType} onChange={setFormApiType} />
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog isOpen={confirmDialogIsOpen} title='请确认' confirmText='是否要删除该提供商？' onConfirm={onConfirmDeleteProvider} onCancel={closeConfirmDialog} />
            <Button onClick={openNewProviderDialog}>新增</Button>
        </div>
    );
}

export default LLMProviderConfig;
