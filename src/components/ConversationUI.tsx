import { invoke } from "@tauri-apps/api/tauri";
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { writeText } from '@tauri-apps/api/clipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddAttachmentResponse, Conversation, Message } from "../data/Conversation";
import ReactMarkdown, { Components } from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import { listen } from "@tauri-apps/api/event";
import { throttle } from 'lodash';
import NewChatComponent from "./NewChatComponent";
import CircleButton from "./CircleButton";
import IconButton from "./IconButton";
import UpArrow from '../assets/up-arrow.svg?react';
import Stop from '../assets/stop.svg?react';
import Add from '../assets/add.svg?react';
import Delete from '../assets/delete.svg?react';
import Edit from '../assets/edit.svg?react';
import Copy from '../assets/copy.svg?react';
import Ok from '../assets/ok.svg?react';
import Refresh from '../assets/refresh.svg?react';
import CodeBlock from "./CodeBlock";
import FileDropArea from "./FileDropArea";

interface CustomComponents extends Components {
    antthinking: React.ElementType;
}

interface AssistantListItem {
    id: number;
    name: string;
}

interface ConversationUIProps {
    conversationId: string;
    onChangeConversationId: (conversationId: string) => void;
}

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}

interface FileInfo {
    id: number;
    name: string;
    path: string;
    thumbnail?: string;
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

function ConversationUI({ conversationId, onChangeConversationId }: ConversationUIProps) {
    const scroll = throttle(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, 300);

    const unsubscribeRef = useRef<Promise<() => void> | null>(null);
    const unsubscribeDropFileRef = useRef<Promise<() => void> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [messages, setMessages] = useState<Array<Message>>([]);
    const [conversation, setConversation] = useState<Conversation>();
    const [assistants, setAssistants] = useState<AssistantListItem[]>([]);
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setConversation(undefined);

            invoke<Array<AssistantListItem>>("get_assistants").then((assistantList) => {
                setAssistants(assistantList);
                if (assistantList.length > 0) {
                    setSelectedAssistant(assistantList[0].id);
                }
            });
            return
        }
        console.log(`conversationId change : ${conversationId}`);
        invoke<Array<any>>("get_conversation_with_messages", { conversationId: +conversationId }).then((res: any[]) => {
            setMessages(res[1]);
            setConversation(res[0]);

            console.log(res)

            if (unsubscribeRef.current) {
                console.log('Unsubscribing from previous event listener');
                unsubscribeRef.current.then(f => f());
            }

            const lastMessageId = res[1][res[1].length - 1].id;

            setMessageId(lastMessageId);
            unsubscribeRef.current = listen(`message_${lastMessageId}`, (event) => {
                const payload = event.payload as string;
                if (payload !== "Tea::Event::MessageFinish") {
                    // 更新messages的最后一个对象
                    setMessages(prevMessages => {
                        const newMessages = [...prevMessages];
                        const index = newMessages.findIndex(msg => msg.id === lastMessageId);
                        if (index !== -1) {
                            newMessages[index] = {
                                ...newMessages[index],
                                content: event.payload as string
                            };
                            scroll();
                        }
                        return newMessages;
                    });
                } else {
                    setAiIsResponsing(false);
                }

            });
        });

        unsubscribeDropFileRef.current = listen('tauri://file-drop', event => {
            console.log(event)
        });

        return () => {
            if (unsubscribeRef.current) {
                console.log("unsubscribe")
                unsubscribeRef.current.then(f => f());
            }
            if (unsubscribeDropFileRef.current) {
                console.log("unsubscribe drop file")
                unsubscribeDropFileRef.current.then(f => f());
            }
        };
    }, [conversationId]);

    useEffect(() => {
        scroll();
    }, [messages]);

    const [inputText, setInputText] = useState("");
    const [aiIsResponsing, setAiIsResponsing] = useState<boolean>(false);
    const [messageId, setMessageId] = useState<number>(-1);
    const handleSend = throttle(() => {
        if (aiIsResponsing) {
            console.log("Cancelling AI");
            console.log(messageId);
            invoke('cancel_ai', { messageId }).then(() => {
                setAiIsResponsing(false);
            });
        } else {
            if (inputText.trim() === "") {
                setInputText("");
                return;
            }
            setAiIsResponsing(true);

            let conversationId = "";
            let assistantId = "";
            if (!conversation || !conversation.id) {
                assistantId = selectedAssistant + "";
            } else {
                conversationId = conversation.id + "";
                assistantId = conversation.assistant_id + "";
            }
            try {
                const userMessage = {
                    id: 0,
                    conversation_id: conversationId ? -1 : +conversationId,
                    llm_model_id: -1,
                    content: inputText,
                    token_count: 0,
                    message_type: "user",
                    created_time: new Date(),
                    attachment_list: []
                };

                setMessages(prevMessages => [...prevMessages, userMessage]);
                invoke<AiResponse>('ask_ai', { request: { prompt: inputText, conversation_id: conversationId, assistant_id: +assistantId, attachment_list: fileInfoList?.map(i => i.id) } })
                    .then((res) => {
                        console.log("ask ai response", res);
                        if (unsubscribeRef.current) {
                            console.log('Unsubscribing from previous event listener');
                            unsubscribeRef.current.then(f => f());
                        }

                        setMessageId(res.add_message_id);

                        if (conversationId != (res.conversation_id + "")) {
                            onChangeConversationId(res.conversation_id + "");
                        } else {
                            const assistantMessage = {
                                id: res.add_message_id,
                                conversation_id: conversationId ? -1 : +conversationId,
                                llm_model_id: -1,
                                content: "",
                                token_count: 0,
                                message_type: "assistant",
                                created_time: new Date(),
                                attachment_list: []
                            };

                            setMessages(prevMessages => [...prevMessages, assistantMessage]);
                        }

                        console.log("Listening for response", `message_${res.add_message_id}`);

                        unsubscribeRef.current = listen(`message_${res.add_message_id}`, (event) => {
                            const payload = event.payload as string;
                            if (payload !== "Tea::Event::MessageFinish") {
                                // 更新messages的最后一个对象
                                setMessages(prevMessages => {
                                    const newMessages = [...prevMessages];
                                    const index = newMessages.findIndex(msg => msg.id === res.add_message_id);
                                    if (index !== -1) {
                                        newMessages[index] = {
                                            ...newMessages[index],
                                            content: event.payload as string
                                        };
                                        scroll();
                                    }
                                    return newMessages;
                                });
                            } else {
                                setAiIsResponsing(false);
                            }

                        });
                    });
            } catch (error) {
                console.error('Error:', error);
            }
            setInputText("");
            setFileInfoList(null);
        }
    }, 200);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter for new line
                return;
            } else {
                // Enter for submit
                e.preventDefault();
                handleSend();
            }
        }
    };

    const filteredMessages = useMemo(() => messages.filter(m => m.message_type !== "system"), [messages]);

    const [selectedAssistant, setSelectedAssistant] = useState(-1);

    const handleArtifact = useCallback((lang: string, inputStr: string) => {
        invoke("run_artifacts", { lang, inputStr }).then((res) => {
            console.log(res);
        });
    }, []);

    const [fileInfoList, setFileInfoList] = useState<Array<FileInfo> | null>(null);
    const handleChooseFile = useCallback(async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Image', extensions: ['png', 'jpg'] }]
            });

            if (selected) {
                const path = selected as string;
                const name = path.split('\\').pop() || path.split('/').pop() || '';

                // 读取文件内容
                const contents = await readBinaryFile(path);

                // 如果是图片,创建缩略图
                let thumbnail;
                if (name.match(/\.(jpg|jpeg|png|gif)$/)) {
                    const blob = new Blob([contents]);
                    thumbnail = URL.createObjectURL(blob);
                }

                let newFile = { id: -1, name, path, thumbnail };
                setFileInfoList([...(fileInfoList || []), newFile]);

                // 调用Rust函数处理文件
                invoke<AddAttachmentResponse>("add_attachment", { fileUrl: path })
                    .then((res) => {
                        newFile.id = res.attachment_id;
                    })
            }
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    }, [fileInfoList]);

    const dropRef = useRef(null);
    const [dragFileOver, setDragFileOver] = useState<boolean>(false);
    const [dropAreaOver, setDropAreaOver] = useState<boolean>(false);

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEnter: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragFileOver(isEnter);
        }
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, dragFileOver);
    const handleDragIn = (e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true);
    const handleDragOut = (e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, false);

    const onFilesSelect = (files: File[]) => {
        setDragFileOver(false);
        files.forEach(file => {

            if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/gif") {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const fileContent = event.target?.result;
                    console.log(`File content: ${fileContent}`);
                    if (typeof fileContent === 'string') {
                        // 调用Rust函数处理文件
                        let newFile = { id: -1, name: file.name, path: "", thumbnail: fileContent };
                        setFileInfoList([...(fileInfoList || []), newFile]);
                        invoke<AddAttachmentResponse>("add_attachment_base64", { fileContent, fileName: file.name })
                            .then((res) => {
                                newFile.id = res.attachment_id;
                            })
                    }
                };
                reader.onerror = (error) => {
                    console.error(`Error reading file: ${file.name}`, error);
                };
                reader.readAsDataURL(file); // 读取文件内容为二进制数据
    
                console.log(`File path: ${file.name}`); // 文件路径（仅文件名）
            }
            
        });
    };

    useEffect(() => {
        const handleFileDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragFileOver(false);
            if (e?.dataTransfer?.files && e?.dataTransfer.files.length > 0) {
                onFilesSelect(Array.from(e.dataTransfer.files));
            }
        };

        const dropElement = dropRef.current as HTMLElement | null;
        if (dropElement) {
            dropElement.addEventListener('drop', handleFileDrop);
        }

        return () => {
            if (dropElement) {
                dropElement.removeEventListener('drop', handleFileDrop);
            }
        };
    }, [onFilesSelect]);


    return (
        <div
            ref={dropRef}
            className="conversation-ui"
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
        >
            {
                conversationId ?
                    <div className="conversation-title-panel">
                        <div className="conversation-title-panel-text-group">
                            <div className="conversation-title-panel-title">{conversation?.name}</div>
                            <div className="conversation-title-panel-assistant-name">{conversation?.assistant_name}</div>
                        </div>
                        <div className="conversation-title-panel-button-group">
                            <IconButton icon={<Edit fill="#468585" />} onClick={() => { }} border />
                            <IconButton icon={<Delete fill="#468585" />} onClick={() => { }} border />
                        </div>
                    </div> : null
            }

            <div className="messages">
                {conversationId ?
                    filteredMessages.map((message, index) => (
                        <MessageItem key={index} message={message} onCodeRun={handleArtifact} />
                    )) : <NewChatComponent
                        selectedAssistant={selectedAssistant}
                        assistants={assistants}
                        setSelectedAssistant={setSelectedAssistant}
                    />
                }
                <div className="message-anchor"></div>
                <div ref={messagesEndRef} />
            </div>
            {dragFileOver || dropAreaOver ? <FileDropArea onDragChange={(state) => setDropAreaOver(state)} onFilesSelect={onFilesSelect} /> : null}
            <div className="input-area">
                <div className="input-area-img-container">
                    {fileInfoList && fileInfoList.length && fileInfoList.map((fileInfo) => (
                        fileInfo.thumbnail && (
                            <img key={fileInfo.id} src={fileInfo.thumbnail} alt="缩略图" className="input-area-img" />
                        )
                    ))}
                </div>
                <textarea
                    className="input-area-textarea"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <CircleButton onClick={handleChooseFile} icon={<Add fill="black" />} className="input-area-add-button" />
                <CircleButton size="large" onClick={handleSend} icon={aiIsResponsing ? <Stop width={20} height={20} fill="white" /> : <UpArrow width={20} height={20} fill="white" />} primary className="input-area-send-button" />

            </div>
        </div>
    );
}

export default ConversationUI;
