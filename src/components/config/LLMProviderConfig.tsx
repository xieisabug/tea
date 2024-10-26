import React, { useCallback, useEffect, useState } from 'react';
import "../../styles/LLMProviderConfig.css";
import { invoke } from "@tauri-apps/api/tauri";
import LLMProviderConfigForm from "./LLMProviderConfigForm";
import FormDialog from "../FormDialog";
import CustomSelect from "../CustomSelect";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "../ui/button";
import { toast } from 'sonner';

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
                toast.error('获取大模型提供商失败: ' + e);
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
            toast.success('添加大模型提供商成功');
            setProviderName('');
            setFormApiType('openai_api');
            closeNewProviderDialog();

            getLLMProviderList();
        }).catch((e) => {
            toast.error('添加大模型提供商失败: ' + e);
        });
    }

    const [confirmDialogIsOpen, setConfirmDialogIsOpen] = useState(false);
    const [deleteLLMProviderId, setDeleteLLMProviderId] = useState("");
    const onConfirmDeleteProvider = useCallback(() => {
        if (!deleteLLMProviderId) {
            return;
        }
        invoke('delete_llm_provider', { llmProviderId: deleteLLMProviderId }).then(() => {
            toast.success('删除大模型提供商成功');
            getLLMProviderList();
        }).catch(e => {
            toast.error('删除大模型提供商失败: ' + e);
        });
        closeConfirmDialog();
    }, [deleteLLMProviderId]);
    const openConfirmDialog = (LLMPRoviderId: string) => {
        setConfirmDialogIsOpen(true)
        setDeleteLLMProviderId(LLMPRoviderId);
    }
    const closeConfirmDialog = useCallback(() => {
        setConfirmDialogIsOpen(false)
    }, []);

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
