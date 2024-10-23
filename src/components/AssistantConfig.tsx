import React, { useCallback, useEffect, useState } from 'react';
import "../styles/AssistantConfig.css";
import { invoke } from "@tauri-apps/api/tauri";
import ConfirmDialog from './ConfirmDialog';
import { AssistantDetail, AssistantListItem } from '../data/Assistant';
import { Button } from './ui/button';
import ConfigForm from './ConfigForm';
import { DialogHeader, DialogFooter, Dialog, DialogTrigger, DialogContent, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { toast } from 'sonner';

interface ModelForSelect {
    name: string;
    code: string;
    id: number;
    llm_provider_id: number;
}

interface AssistantType {
    code: number;
    name: string;
}

interface AssistantConfigProps {
    pluginList: any[];
}
const AssistantConfig: React.FC<AssistantConfigProps> = ({ pluginList }) => {
    const assistantTypeApi: AssistantTypeApi = {
        typeRegist: (code: number, label: string) => {
            console.log("regist type", code, label);
            // 检查是否已存在相同的 code
            setAssistantTypes(prev => {
                if (!prev.some(type => type.code === code)) {
                    return [...prev, {code: code, name: label}];
                } else {
                    return prev;
                }
            });
        },
        changeFieldLabel: (fieldName: string, label: string) => {},
        addField: (fieldName: string, label: string, type: string, fieldConfig?: FieldConfig) => {},
        addFieldTips: (fieldName: string, tips: string) => {},
        runLogic: (callback: (assistantRunApi: AssistantRunApi) => void) => {}
    };

    const [assistantTypes, setAssistantTypes] = useState<AssistantType[]>([{ code: 0, name: "普通对话助手" }]);
    useEffect(() => {
        console.log(assistantTypes);
    }, [assistantTypes])

    useEffect(() => {
        console.log("plugin load and init", pluginList);
        pluginList.filter((plugin: any) => plugin.pluginType.includes("assistantType")).forEach((plugin: any) => {
            plugin.instance.onInit(assistantTypeApi);
        });
    }, [pluginList]);

    // 基础数据
    // 模型数据
    const [models, setModels] = useState<ModelForSelect[]>([]);
    useEffect(() => {
        invoke<Array<ModelForSelect>>("get_models_for_select")
            .then(setModels)
            .catch((error) => {
                toast.error('获取模型列表失败: ' + error);
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
        }).catch((error) => {
            toast.error('获取助手列表失败: ' + error);
        });
    }, []);
    const onSave = (assistant: AssistantDetail) => {
        return invoke("save_assistant", { assistantDetail: assistant }).catch((error) => {
            toast.error('保存助手失败: ' + error);
        });
    }
    const onCopy = (assistantId: number) => {
        invoke<AssistantDetail>("copy_assistant", { assistantId }).then((assistantDetail: AssistantDetail) => {
            setAssistants((prev) => [...prev, { id: assistantDetail.assistant.id, name: assistantDetail.assistant.name }]);
            setCurrentAssistant(assistantDetail);
            toast.success('复制助手成功');
        }).catch((error) => {
            toast.error('复制助手失败: ' + error);
        });
    }

    const handleChooseAssistant = (assistant: AssistantListItem) => {
        if (!currentAssistant || currentAssistant.assistant.id !== assistant.id) {
            invoke<AssistantDetail>("get_assistant", { assistantId: assistant.id })
                .then((assistant: AssistantDetail) => {
                    setCurrentAssistant(assistant);
                })
                .catch((error) => {
                    toast.error('获取助手信息失败: ' + error);
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
                    toast.success('保存成功');
                })
                .catch((error) => {
                    toast.error('保存失败: ' + error);
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
                toast.success('删除助手成功');
            }).catch((error) => {
                toast.error('删除助手失败: ' + error);
            });
        }
    }, [currentAssistant, assistants]);

    // 修改助手名称与描述
    const [formDialogIsOpen, setFormDialogIsOpen] = useState<boolean>(false);
    const openFormDialog = useCallback(() => {
        updateAssistantForm.reset({
            name: currentAssistant?.assistant.name || "",
            description: currentAssistant?.assistant.description || "",
        });
        setFormDialogIsOpen(true);
    }, [currentAssistant]);
    const closeFormDialog = useCallback(() => {
        setFormDialogIsOpen(false);
    }, []);
    const handleFormSubmit = useCallback((values: z.infer<typeof updateAssistantSchema>) => {
        if (currentAssistant) {
            const newCurrentAssistant = {
                ...currentAssistant,
                assistant: {
                    ...currentAssistant.assistant,
                    name: values.name,
                    description: values.description ?? null,
                },
            };
            onSave(newCurrentAssistant).then(() => {
                setCurrentAssistant(newCurrentAssistant);
                setFormDialogIsOpen(false);
                const index = assistants.findIndex((assistant) => assistant.id === currentAssistant.assistant.id);
                if (index >= 0) {
                    const newAssistants = [...assistants];
                    newAssistants[index] = { id: currentAssistant.assistant.id, name: values.name };
                    setAssistants(newAssistants);
                }
                toast.success('修改助手名称与描述成功');
            }).catch((error) => {
                toast.error('修改助手名称与描述失败: ' + error);
            });
        }
    }, [currentAssistant]);

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
            className: "h-48",
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

    const [openAddAssistantDialog, setOpenAddAssistantDialog] = useState<boolean>(false);

    // 定义表单的验证模式
    const formSchema = z.object({
        name: z.string().min(1, "名称不能为空"),
        description: z.string(),
        assistantType: z.string(),
    });

    // 定义表单
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "初始化助手名称",
            description: "这是一个初始化的描述",
            assistantType: "0",
        },
    });

    // 处理表单提交
    const onSubmit = (values: z.infer<typeof formSchema>) => {
        invoke<AssistantDetail>("add_assistant", {
            name: values.name,
            description: values.description,
            assistantType: parseInt(values.assistantType),
        })
            .then((assistantDetail: AssistantDetail) => {
                setAssistants((prev) => [...prev, { id: assistantDetail.assistant.id, name: assistantDetail.assistant.name }]);
                setCurrentAssistant(assistantDetail);
                setOpenAddAssistantDialog(false);
                toast.success('新增助手成功');
            })
            .catch((error) => {
                toast.error('新增助手失败: ' + error);
            });
    };

    const updateAssistantSchema = z.object({
        name: z.string().min(1, "名称不能为空"),
        description: z.string().optional(),
    });

    const updateAssistantForm = useForm<z.infer<typeof updateAssistantSchema>>({
        resolver: zodResolver(updateAssistantSchema),
        defaultValues: {
            name: currentAssistant?.assistant.name || "",
            description: currentAssistant?.assistant.description || "",
        },
    });

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

                <Dialog open={openAddAssistantDialog} onOpenChange={setOpenAddAssistantDialog}>
                    <DialogTrigger asChild>
                        <Button>新增</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新增助手</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>名称</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>描述</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="assistantType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>类型</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="选择助手类型" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {assistantTypes.map((type) => (
                                                            <SelectItem key={type.code} value={type.code.toString()}>{type.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit">确认</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
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

            <Dialog open={formDialogIsOpen} onOpenChange={closeFormDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>修改助手 : {currentAssistant?.assistant.name}</DialogTitle>
                    </DialogHeader>
                    <Form {...updateAssistantForm}>
                        <form onSubmit={updateAssistantForm.handleSubmit(handleFormSubmit)} className='form-group-container'>
                            <FormField
                                control={updateAssistantForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>名称:</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={updateAssistantForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>描述:</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit">确认</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssistantConfig;
