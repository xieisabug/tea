import React from "react";

interface MessageWebContentProps {
    url: string;
}

const MessageWebContent: React.FC<MessageWebContentProps> = (props) => {
    const { url } = props;

    return (
        <div className="message-web-content">
            <span>URL：{url}</span>
        </div>
    );
};

export default MessageWebContent;
