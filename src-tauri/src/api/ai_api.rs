use serde::{Deserialize, Serialize};
use tokio::time::timeout;
use crate::api::assistant_api::get_assistant;
use crate::api::llm::get_provider;
use crate::db::assistant_db::AssistantModelConfig;
use crate::db::conversation_db::{Conversation, ConversationDatabase, Message};
use crate::db::llm_db::LLMDatabase;
use crate::AppState;
use tauri::State;
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Serialize, Deserialize)]
pub struct AiRequest {
    conversation_id: String,
    assistant_id: i64,
    prompt: String,
    model: Option<String>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
    stream: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct AiResponse {
    conversation_id: i64,
    add_message_id: i64,
}

#[tauri::command]
pub async fn ask_ai(state: State<'_, AppState>, window: tauri::Window, request: AiRequest) -> Result<AiResponse, String> {
    let (tx, mut rx) = mpsc::channel(100);

    let selected_text = state.inner().selected_text.lock().await.clone();
    let assistant_detail = get_assistant(request.assistant_id).unwrap();
    let assistant_prompt = &assistant_detail.prompts[0].prompt;
    if assistant_detail.model.is_empty() {
        return Err("No model found".to_string());
    }

    let mut init_message_list: Vec<(String, String)> = vec![];
    let mut add_message_id = None;
    let mut conversation_id = 0;
    let need_generate_title = request.conversation_id.is_empty();

    if request.conversation_id.is_empty() {
        init_message_list = vec![(String::from("system"), assistant_prompt.to_string()), (String::from("user"), request.prompt.clone())];
        let conversation = init_conversation(request.assistant_id, assistant_detail.model[0].model_id.parse::<i64>().unwrap(), &init_message_list).unwrap();
        conversation_id = conversation.0.id;

        let add_message = add_message(conversation.0.id, "assistant".to_string(), String::new(), Some(assistant_detail.model[0].model_id.parse::<i64>().unwrap()), 0).unwrap();
        add_message_id = Some(add_message.id);
    } else {
        let db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
        conversation_id = request.conversation_id.parse::<i64>().unwrap();

        let mut message_list = vec![];
        for message in Message::list_by_conversation_id(&db.conn, conversation_id).unwrap() {
            message_list.push((message.message_type.clone(), message.content.clone()));
        }

        let _ = add_message(conversation_id, "user".to_string(), request.prompt.clone(), Some(assistant_detail.model[0].model_id.parse::<i64>().unwrap()), 0).unwrap();
        message_list.push((String::from("user"), request.prompt.clone()));
        init_message_list = message_list;
        let add_assistant_message = add_message(conversation_id, "assistant".to_string(), String::new(), Some(assistant_detail.model[0].model_id.parse::<i64>().unwrap()), 0).unwrap();

        add_message_id = Some(add_assistant_message.id);
    }

    if add_message_id.is_some() {
        let window_clone = window.clone();
        
        tokio::spawn(async move {
            let db = LLMDatabase::new().map_err(|e| e.to_string())?;
            let conversation_db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
            let model_id = &assistant_detail.model[0].model_id;    
            let model_detail = db.get_llm_model_detail(model_id.parse::<i64>().unwrap()).unwrap();
            println!("model detail : {:#?}", model_detail);

            let provider = get_provider(model_detail.provider, model_detail.configs);

            let mut model_config_clone = assistant_detail.model_configs.clone();
            model_config_clone.push(AssistantModelConfig {
                id: 0,
                assistant_id: assistant_detail.assistant.id,
                assistant_model_id: model_detail.model.id,
                name: "model".to_string(),
                value: Some(model_detail.model.code)
            });
            
            let config_map = assistant_detail.model_configs.iter().filter_map(|config| {
                config.value.as_ref().map(|value| (config.name.clone(), value.clone()))
            }).collect::<HashMap<String, String>>();
    
            let stream = config_map.get("stream").and_then(|v| v.parse().ok()).unwrap_or(false);
    
            let mut prompt = request.prompt.clone();
            if prompt.contains("!s") {
                prompt = prompt.replace("!s", &selected_text);
            }
    
            println!("prompt: {}", prompt);

            if stream {
                if let Err(e) = provider.chat_stream(add_message_id.unwrap(), init_message_list, model_config_clone, tx).await {
                    eprintln!("Chat stream error: {}", e);
                }
            } else {
                let content = provider.chat(add_message_id.unwrap(), init_message_list, model_config_clone)
                    .await
                    .map_err(|e| e.to_string())?;

                println!("Chat content: {}", content.clone());

                tx.send((add_message_id.unwrap(), content.clone(), true)).await.unwrap();
                // Ensure tx is closed after sending the message
                drop(tx);
            }
            Ok::<(), String>(())
        });

        tokio::spawn(async move {
            loop {
                match timeout(Duration::from_secs(10), rx.recv()).await {
                    Ok(Some((id, content, done))) => {
                        println!("Received data: id={}, content={}", id, content);
                        window_clone.emit(format!("message_{}", id).as_str(), content.clone())
                            .map_err(|e| e.to_string()).unwrap();

                        if done {
                            let conversation_db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string());
                            let _ = Message::update(&conversation_db.unwrap().conn, add_message_id.unwrap(), conversation_id, content.clone(), 0);

                            if need_generate_title {
                                
                            }
                        }
                    }
                    Ok(None) => {
                        println!("Channel closed");
                        break;
                    }
                    Err(_) => {
                        println!("Timeout waiting for data");
                        // Decide whether to break or continue based on your requirements
                    }
                }
            }
        });
    }

    Ok(AiResponse {
        conversation_id: conversation_id,
        add_message_id: add_message_id.unwrap(),
    })
}

fn init_conversation(assistant_id: i64, llm_model_id: i64, messages: &Vec<(String, String)>) -> Result<(Conversation, Vec<Message>), String> {
    let db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
    let conversation = Conversation::create(&db.conn, "新对话".to_string(), Some(assistant_id));
    let conversation_clone = conversation.unwrap().clone();
    let conversation_id = conversation_clone.id;
    let mut message_result_array = vec![];
    for (message_type, content) in messages {
        let message = Message::create(&db.conn, conversation_id, message_type.clone(), content.clone(), Some(llm_model_id), 0);
        message_result_array.push(message.unwrap().clone());
    }

    Ok((conversation_clone, message_result_array))
}

fn add_message(conversation_id: i64, message_type: String, content: String, llm_model_id: Option<i64>, token_count: i32) -> Result<Message, String> {
    let db = ConversationDatabase::new().map_err(|e: rusqlite::Error| e.to_string())?;
    let message = Message::create(&db.conn, conversation_id, message_type, content, llm_model_id, token_count);
    Ok(message.unwrap().clone())
}