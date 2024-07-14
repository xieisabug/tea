export interface Conversation {
    id: number;
    name: string;
    assistant_id: number | null;
    created_time: Date;
}

export interface Message {
    id: number;
    conversation_id: number;
    message_type: string;
    content: string;
    llm_model_id: number | null;
    created_time: Date;
    token_count: number;
}
