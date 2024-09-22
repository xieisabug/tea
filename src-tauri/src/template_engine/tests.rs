use super::*;
use chrono::Local;
use mockito::mock;

#[test]
fn test_parse_current_date() {
    let template_engine = TemplateEngine::new();
    let result = template_engine.parse("test !current_date test", &HashMap::new());
    println!("result : {}", result);
    assert_eq!(result.contains(&Local::now().format("%Y-%m-%d").to_string()), true);

    let result2 = template_engine.parse("test !cd test", &HashMap::new());
    println!("result2 : {}", result2);
    assert_eq!(result2.contains(&Local::now().format("%Y-%m-%d").to_string()), true);

    let result3 = template_engine.parse("test!cd()test", &HashMap::new());
    println!("result3 : {}", result3);
    assert_eq!(result3.contains(&Local::now().format("%Y-%m-%d").to_string()), true);
}

#[test]
fn test_parse_sub_start() {
    let template_engine = TemplateEngine::new();
    let result = template_engine.parse("test !sub_start(123123123123,3) test", &HashMap::new());
    println!("result : {}", result);
    assert_eq!(result, "test 123 test");

    let result2 = template_engine.parse("test !sub_start(asfdsafd 123123,asfasf,123123,12) test", &HashMap::new());
    println!("result2 : {}", result2);
    assert_eq!(result2, "test asfdsafd 123 test");
}

#[test]
fn test_parse_selected_text() {
    let template_engine = TemplateEngine::new();
    let mut context = HashMap::new();
    context.insert("selected_text".to_string(), "test".to_string());
    let result = template_engine.parse("test !selected_text test", &context);
    println!("result : {}", result);
    assert_eq!(result, "test test test");

    let result2 = template_engine.parse("test !s test", &context);
    println!("result2 : {}", result2);
    assert_eq!(result2, "test test test");
}

#[test]
fn test_parse_mix() {
    let template_engine = TemplateEngine::new();
    let mut context = HashMap::new();
    context.insert("selected_text".to_string(), "test".to_string());
    let result = template_engine.parse("test!sub_start(!selected_text,2)test", &context);
    println!("result : {}", result);
    assert_eq!(result, "testtetest");

    let result2 = template_engine.parse("test!sub_start(!cd,4)test", &context);
    println!("result2 : {}", result2);
    assert_eq!(result2.contains(&Local::now().format("%Y").to_string()), true);

    let result3 = template_engine.parse("test!sub_start(!sub_start(!cd,4),2)test", &context);
    println!("result3 : {}", result3);
    assert_eq!("test20test", result3);
}

#[test]
fn test_screen_command() {
    let engine = TemplateEngine::new();
    let context = HashMap::new();
    let result = engine.parse("!screen", &context);
    assert!(!result.is_empty());
    let result = engine.parse("!sc", &context);
    assert!(!result.is_empty());
}

#[test]
fn test_web_command() {
    let html_content = "<html><body><h1>Hello, World!</h1><p>This is a test.</p></body></html>";
    let mock = mock("GET", "/")
        .with_status(200)
        .with_header("content-type", "text/html")
        .with_body(html_content)
        .expect(3)
        .create();

    // 先确认mock server是否正常
    let client = reqwest::blocking::Client::new();
    let response = client.get(&mockito::server_url()).send().unwrap();

    assert_eq!(response.status(), 200);
    assert_eq!(response.headers().get("content-type").unwrap(), "text/html");

    let body = response.text().unwrap();
    println!("test case body : {}", body);
    assert_eq!(body, html_content);

    let engine = TemplateEngine::new();
    let context = HashMap::new();

    let result = engine.parse(&format!("!web({})", mockito::server_url()), &context);
    assert_eq!(result, html_content);

    let result = engine.parse(&format!("!w({})", mockito::server_url()), &context);
    assert_eq!(result, html_content);

    mock.assert();

}

#[test]
fn test_web_to_markdown_command() {
    let html_content = "<html><body><h1>Hello, World!</h1><p>This is a test.</p></body></html>";
    let mock = mock("GET", "/")
        .with_status(200)
        .with_header("content-type", "text/html")
        .with_body(html_content)
        .expect(3)
        .create();


    // 先确认mock server是否正常
    let client = reqwest::blocking::Client::new();
    let response = client.get(&mockito::server_url()).send().unwrap();

    assert_eq!(response.status(), 200);
    assert_eq!(response.headers().get("content-type").unwrap(), "text/html");

    let body = response.text().unwrap();
    println!("test case body : {}", body);
    assert_eq!(body, html_content);

    let engine = TemplateEngine::new();

    let context = HashMap::new();
    let result = engine.parse(&format!("!web_to_markdown({})", mockito::server_url()), &context);
    assert_eq!(result.trim(), "# Hello, World!\n\nThis is a test.");

    let result = engine.parse(&format!("!wm({})", mockito::server_url()), &context);
    assert_eq!(result.trim(), "# Hello, World!\n\nThis is a test.");

    mock.assert();
}
