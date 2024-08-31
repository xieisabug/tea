import React from "react";

interface MessageFileAttachmentProps {
    content?: string;
    name: string;
}

const MessageFileAttachment: React.FC<MessageFileAttachmentProps> = (props) => {
    const { content, name } = props;

    return (
        <div
            className="message-file-attachment"
            title={content?.substring(0, 20)}
        >
            <span>文件名称：{name}</span>
        </div>
    );
};

export default MessageFileAttachment;
