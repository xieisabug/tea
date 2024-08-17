import React, { useCallback, useEffect, useState } from "react";
import { writeText } from '@tauri-apps/api/clipboard';
import ReactMarkdown, { Components } from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import IconButton from "./IconButton";
import Copy from '../assets/copy.svg?react';
import Ok from '../assets/ok.svg?react';
import Refresh from '../assets/refresh.svg?react';
import CodeBlock from "./CodeBlock";
import Delete from '../assets/delete.svg?react';

interface CustomComponents extends Components {
    antthinking: React.ElementType;
}

const MessageItem = React.memo(({ message, onCodeRun }: any) => {
    const [copyIconState, setCopyIconState] = useState<'copy' | 'ok'>('copy');

    const handleCopy = useCallback(() => {
        writeText(message.content);
        setCopyIconState('ok');
    }, [message.content]);

    useEffect(() => {
        if (copyIconState === 'ok') {
            const timer = setTimeout(() => {
                setCopyIconState('copy');
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [copyIconState]);

    return (
        <div className={"message-item " + (message.message_type === "user" ? "user-message" : "bot-message")}>
            <ReactMarkdown
                children={message.content}
                remarkPlugins={[remarkMath, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}

                components={{
                    code({ node, className, children, ref, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                            <CodeBlock language={match[1]} onCodeRun={onCodeRun}>
                                {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                        ) : (
                            <code {...props} ref={ref} className={className} style={{ overflow: "auto", display: "block" }}>
                                {children}
                            </code>
                        );
                    },
                    antthinking({ children }) {
                        return <div>
                            <div className="llm-thinking-badge" title={children} data-thinking={children}>思考...</div>
                        </div>
                    }
                } as CustomComponents}
            />
            {
                message.attachment_list.filter((a: any) => a.attachment_type === "Image").length ?
                    <div className="message-image" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                        {
                            message.attachment_list.filter((a: any) => a.attachment_type === "Image").map((attachment: any) => (
                                <img key={attachment.attachment_url} style={{ flex: 1 }} src={attachment.attachment_content} />
                            ))
                        }
                    </div>
                    : null
            }

            <div className="message-item-button-container">
                <IconButton icon={<Delete fill="black" />} onClick={() => { }} />
                <IconButton icon={<Refresh fill="black" />} onClick={() => { }} />
                <IconButton icon={copyIconState === 'copy' ? <Copy fill="black" /> : <Ok fill="black" />} onClick={handleCopy} />
            </div>
        </div>
    )
});

export default MessageItem;