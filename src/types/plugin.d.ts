interface SystemApi {
}

interface AssistantTypeApi {
    typeRegist(code: number, label: string): void;
    changeFieldLabel(fieldName: string, label: string): void;
    addField(fieldName: string, label: string, type: string, fieldConfig?: FieldConfig): void;
    addFieldTips(fieldName: string, tips: string): void;
    runLogic(callback: (assistantRunApi: AssistantRunApi) => void): void;
}

interface FieldConfig {
    // default none
    position?: 'query' | 'body' | 'header' | 'none';
    // default false
    required?: boolean;
    // default false
    hidden?: boolean;
    tips?: string;
}

interface AssistantRunApi {
    askAI(question: string, modelId: string, prompt?: string, conversationId?: string): void;
    askAssistant(question: string, assistantId: string, conversationId?: string): void;
    getUserInput(): string;
    setModelId(modelId: string);
    getModelId(): string;
    getField(fieldName: string): string;
    appendAiResponse(response: string): void;
    setAiResponse(response: string): void;
}

declare class Config {
    name: string;
    type: string[];
}

declare class TeaPlugin {
    onPluginLoad(systemApi: SystemApi): void;
    renderComponent?(): React.ReactNode;
    config(): Config;
}

declare class TeaAssistantTypePlugin {
    onInit(assistantTypeApi: AssistantTypeApi): void;
}