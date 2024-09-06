import React from "react";

interface MessageFileAttachmentProps {
    title: string;
    name: string;
}

const MessageFileAttachment: React.FC<MessageFileAttachmentProps> = (props) => {
    const { title, name } = props;

    return (
        <div className="message-file-attachment" title={title}>
            <span>文件名称：{name}</span>
        </div>
    );
};

export default MessageFileAttachment;
