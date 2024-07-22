use super::*;
use chrono::Local;

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