use std::sync::Arc;

use futures::{future::BoxFuture, Future};
use ollama::OllamaProvider;
use tokio::sync::mpsc;

use crate::db::{assistant_db::AssistantModelConfig, llm_db::{LLMProvider, LLMProviderConfig}};

use super::llm_api::LlmModel;

pub mod ollama;
pub mod openai;

pub trait ModelProvider: Send + Sync {
    fn new(llm_provider_config: Vec<LLMProviderConfig>) -> Self where Self: Sized;

    fn chat(&self, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>) 
        -> BoxFuture<'static, Result<String, Box<dyn std::error::Error>>>;

    fn chat_stream(&self, messages: Vec<(String, String)>, model_config: Vec<AssistantModelConfig>, tx: mpsc::Sender<String>) 
        -> BoxFuture<'static, Result<(), Box<dyn std::error::Error>>>;

    fn models(&self) -> BoxFuture<'static, Result<Vec<LlmModel>, String>>;
}

pub fn get_provider(provider: LLMProvider, llm_provider_config: Vec<LLMProviderConfig>) -> Arc<dyn ModelProvider> {
    match provider.api_type.as_str() {
        "ollama" => Arc::new(OllamaProvider::new(llm_provider_config)), // 传入适当的配置
        // 其他提供商...
        _ => panic!("Unknown provider: {} and type: {}", provider.name, provider.api_type),
    }
}
