use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio_util::sync::CancellationToken;

pub struct MessageTokenManager {
    tokens: Arc<Mutex<HashMap<i64, CancellationToken>>>,
}

impl MessageTokenManager {
    pub fn new() -> Self {
        Self {
            tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn exist(&self, message_id: i64) -> bool {
        let map = self.tokens.lock().unwrap();
        map.contains_key(&message_id)
    }

    pub fn store_token(&self, message_id: i64, token: CancellationToken) {
        let mut map = self.tokens.lock().unwrap();
        map.insert(message_id, token);
    }

    pub fn cancel_request(&self, message_id: i64) {
        let mut map = self.tokens.lock().unwrap();
        if let Some(token) = map.remove(&message_id) {
            token.cancel();
        } else {
            println!("未找到message_id {} 对应的 cancel token", message_id);
        }
    }

    pub fn remove_token(&self, message_id: i64) {
        let mut map = self.tokens.lock().unwrap();
        map.remove(&message_id);
    }

    pub fn get_tokens(&self) -> Arc<Mutex<HashMap<i64, CancellationToken>>> {
        Arc::clone(&self.tokens)
    }
}
