use crate::api::llm_api::LlmModel;

use super::ModelProvider;

struct OpenAIProvider {
    // 这里可以添加一些私有字段
}

impl ModelProvider for OpenAIProvider {
    fn new(llm_provider_config: Vec<crate::db::llm_db::LLMProviderConfig>) -> Self where Self: Sized {
        todo!()
    }

    fn chat(&self, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>) 
        -> futures::future::BoxFuture<'static, Result<String, Box<dyn std::error::Error>>> {
        todo!()
    }

    fn chat_stream(&self, messages: Vec<(String, String)>, model_config: Vec<crate::db::assistant_db::AssistantModelConfig>, tx: tokio::sync::mpsc::Sender<String>) 
        -> futures::future::BoxFuture<'static, Result<(), Box<dyn std::error::Error>>> {
        todo!()
    }

    fn models(&self) -> futures::future::BoxFuture<'static, Result<Vec<LlmModel>, String>> {
        todo!()
    }
}