use std::collections::HashMap;
use chrono::Local; // 需要在Cargo.toml中添加 `chrono` 依赖
use regex::Regex; // 需要在Cargo.toml中添加 `regex` 依赖

// 定义命令处理函数类型
type CommandFn = fn(&TemplateEngine, &str, &HashMap<String, String>) -> String;

// 获取当前日期的命令处理函数
fn current_date(_: &TemplateEngine, _: &str, _: &HashMap<String, String>) -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

// 获取当前时间的命令处理函数
fn current_time(_: &TemplateEngine, _: &str, _: &HashMap<String, String>) -> String {
    Local::now().format("%H:%M:%S").to_string()
}

// 截取指定长度字符的命令处理函数
fn sub_start(engine: &TemplateEngine, input: &str, context: &HashMap<String, String>) -> String {
    println!("input : {}", input);
    let re = Regex::new(r"\((.*),(\d+)\)").unwrap();
    for cap in re.captures_iter(input) {
        println!("cap : {:?}", &cap);
        let text_origin = &cap[1];
        let num = &cap[2];

        let text = engine.parse(text_origin.trim(), context);
        if let Ok(count) = num.trim().parse::<usize>() { 
            return text.chars().take(count).collect();
        }    
    }
    String::new()
}

fn selected_text(_: &TemplateEngine, _: &str, context: &HashMap<String, String>) -> String {
    context.get("selected_text").unwrap_or(&String::default()).to_string()
}

// 模板解析器结构体
pub struct TemplateEngine {
    commands: HashMap<String, CommandFn>,
}

impl TemplateEngine {
    // 初始化模板解析器
    pub fn new() -> Self {
        let mut commands = HashMap::new();
        commands.insert("current_date".to_string(), current_date as CommandFn);
        commands.insert("cd".to_string(), current_date as CommandFn);

        commands.insert("current_time".to_string(), current_time as CommandFn);
        commands.insert("ct".to_string(), current_time as CommandFn);

        commands.insert("sub_start".to_string(), sub_start as CommandFn);

        commands.insert("selected_text".to_string(), selected_text as CommandFn);
        commands.insert("s".to_string(), selected_text as CommandFn);

        TemplateEngine { commands }
    }

    // 注册命令
    pub fn register_command(&mut self, name: &str, handler: CommandFn) {
        self.commands.insert(name.to_string(), handler);
    }

    // 解析并替换模板字符串
    pub fn parse(&self, template: &str, context: &HashMap<String, String>) -> String {
        // !@\s*(\w+)(\([^)]*\))?@!
        let re = Regex::new(r"[!！](\w+)(\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))*\))*\))*\))*\))*\))*\))*\))?").unwrap();
        let mut result = template.to_string();

        for cap in re.captures_iter(template) {
            println!("cap : {:?}", &cap);
            let command = &cap[1];
            let args = cap.get(2).map_or("", |m| m.as_str());
            if let Some(handler) = self.commands.get(command) {
                let replacement = handler(self, args, context);
                result = result.replace(&cap[0], &replacement);
            }
        }

        // 替换上下文变量
        for (key, value) in context {
            let placeholder = format!("!{}", key);
            result = result.replace(&placeholder, value);
        }

        result
    }
}

#[cfg(test)]
mod tests;