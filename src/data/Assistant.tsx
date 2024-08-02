export interface AssistantListItem {
    id: number;
    name: string;
}

export interface Assistant {
    id: number;
    name: string;
    description: string | null;
    assistant_type: number; // 0: 普通对话助手, 1: 多模型对比助手，2: 工作流助手，3: 展示助手
    is_addition: boolean;
    created_time: string;
}

export interface AssistantModel {
    id: number;
    assistant_id: number;
    model_code: string;
    provider_id: number;
    alias: string;
}

export interface AssistantPrompt {
    id: number;
    assistant_id: number;
    prompt: string;
    created_time: string;
}

export interface AssistantModelConfig {
    id: number;
    assistant_id: number;
    name: string;
    value: string;
    value_type: string;
}

export interface AssistantPromptParam {
    id: number;
    assistant_id: number;
    assistant_prompt_id: number;
    param_name: string;
    param_type: string;
    param_value: string | null;
}

export interface AssistantDetail {
    assistant: Assistant;
    prompts: AssistantPrompt[];
    model: AssistantModel[];
    model_configs: AssistantModelConfig[];
    prompt_params: AssistantPromptParam[];
}