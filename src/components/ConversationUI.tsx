import React, { useState } from "react";

function ConversationUI() {
    const [messages, setMessages] = useState([
        { sender: "User", text: "Hello!" },
        { sender: "Bot", text: "Hi there!" }
    ]);
    const [inputText, setInputText] = useState("");

    const handleSend = () => {
        if (inputText.trim() !== "") {
            setMessages([...messages, { sender: "User", text: inputText }]);
            setInputText("");
        }
    };

    return (
        <div className="conversation-ui">
            <div className="messages">
                {messages.map((message, index) => (
                    <div key={index} className={message.sender === "User" ? "user-message" : "bot-message"}>
                        <strong>{message.sender}:</strong> {message.text}
                    </div>
                ))}
            </div>
            <div className="input-area">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}

export default ConversationUI;
