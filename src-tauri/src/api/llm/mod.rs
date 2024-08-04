use std::sync::Arc;

use anthropic::AnthropicProvider;
use futures::future::BoxFuture;
use ollama::OllamaProvider;
use openai::OpenAIProvider;

use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::db::{
    assistant_db::AssistantModelConfig,
    llm_db::{LLMProvider, LLMProviderConfig},
};

use super::llm_api::LlmModel;

mod anthropic;
mod ollama;
mod openai;

pub trait ModelProvider: Send + Sync {
    fn new(llm_provider_config: Vec<LLMProviderConfig>) -> Self
    where
        Self: Sized;

    fn chat(
        &self,
        message_id: i64,
        messages: Vec<(String, String)>,
        model_config: Vec<AssistantModelConfig>,
        cancel_token: CancellationToken,
    ) -> BoxFuture<'static, Result<String, Box<dyn std::error::Error>>>;

    fn chat_stream(
        &self,
        message_id: i64,
        messages: Vec<(String, String)>,
        model_config: Vec<AssistantModelConfig>,
        tx: mpsc::Sender<(i64, String, bool)>,
        cancel_token: CancellationToken,
    ) -> BoxFuture<'static, Result<(), Box<dyn std::error::Error>>>;

    fn models(&self) -> BoxFuture<'static, Result<Vec<LlmModel>, String>>;
}

pub fn get_provider(
    provider: LLMProvider,
    llm_provider_config: Vec<LLMProviderConfig>,
) -> Arc<dyn ModelProvider> {
    match provider.api_type.as_str() {
        "ollama" => Arc::new(OllamaProvider::new(llm_provider_config)), // 传入适当的配置
        "openai_api" => Arc::new(OpenAIProvider::new(llm_provider_config)), // 传入适当的配置
        "anthropic" => Arc::new(AnthropicProvider::new(llm_provider_config)), // 传入适当的配置
        // 其他提供商...
        _ => panic!(
            "Unknown provider: {} and type: {}",
            provider.name, provider.api_type
        ),
    }
}
