interface LLMProviderConfig {
    name: string;
    value: string;
    append_location: string;
    is_addition: boolean;
}

interface LLMModel {
    id: number;
    name: string;
    llmProviderId: number;
    code: string;
    description: string;
    visionSupport: boolean;
    audioSupport: boolean;
    videoSupport: boolean;
}