import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { readBinaryFile } from "@tauri-apps/api/fs";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AddAttachmentResponse,
    AttachmentType,
    Conversation,
    FileInfo,
    Message,
} from "../data/Conversation";
import "katex/dist/katex.min.css";
import { listen } from "@tauri-apps/api/event";
import { throttle } from "lodash";
import NewChatComponent from "./NewChatComponent";
import FileDropArea from "./FileDropArea";
import MessageItem from "./MessageItem";
import ConversationTitle from "./conversation/ConversationTitle";
import useFileDropHandler from "../hooks/useFileDropHandler";
import InputArea from "./conversation/InputArea";
import FormDialog from "./FormDialog";
import useConversationManager from "../hooks/useConversationManager";

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

function ConversationUI({
    conversationId,
    onChangeConversationId,
}: ConversationUIProps) {
    const scroll = throttle(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, 300);

    const unsubscribeRef = useRef<Promise<() => void> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [messages, setMessages] = useState<Array<Message>>([]);
    const [conversation, setConversation] = useState<Conversation>();
    const [assistants, setAssistants] = useState<AssistantListItem[]>([]);

    const [isLoadingShow, setIsLoadingShow] = useState(false);
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setConversation(undefined);

            invoke<Array<AssistantListItem>>("get_assistants").then(
                (assistantList) => {
                    setAssistants(assistantList);
                    if (assistantList.length > 0) {
                        setSelectedAssistant(assistantList[0].id);
                    }
                },
            );
            return;
        }
        setIsLoadingShow(true);
        console.log(`conversationId change : ${conversationId}`);
        invoke<Array<any>>("get_conversation_with_messages", {
            conversationId: +conversationId,
        }).then((res: any[]) => {
            setMessages(res[1]);
            setConversation(res[0]);
            setIsLoadingShow(false);

            console.log(res);

            if (unsubscribeRef.current) {
                console.log("Unsubscribing from previous event listener");
                unsubscribeRef.current.then((f) => f());
            }

            const lastMessageId = res[1][res[1].length - 1].id;

            setMessageId(lastMessageId);
            unsubscribeRef.current = listen(
                `message_${lastMessageId}`,
                (event) => {
                    const payload = event.payload as string;
                    if (payload !== "Tea::Event::MessageFinish") {
                        // 更新messages的最后一个对象
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const index = newMessages.findIndex(
                                (msg) => msg.id === lastMessageId,
                            );
                            if (index !== -1) {
                                newMessages[index] = {
                                    ...newMessages[index],
                                    content: event.payload as string,
                                };
                                scroll();
                            }
                            return newMessages;
                        });
                    } else {
                        setAiIsResponsing(false);
                    }
                },
            );
        });

        return () => {
            if (unsubscribeRef.current) {
                console.log("unsubscribe");
                unsubscribeRef.current.then((f) => f());
            }
        };
    }, [conversationId]);

    useEffect(() => {
        const unsubscribe = listen("title_change", (event) => {
            const [conversationId, title] = event.payload as [string, string];

            if (conversation && conversation.id.toString() === conversationId) {
                const newConversation = { ...conversation, name: title };
                setConversation(newConversation);
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, [conversation]);

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
            invoke("cancel_ai", { messageId }).then(() => {
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
                    attachment_list: [],
                    regenerate: null,
                };

                setMessages((prevMessages) => [...prevMessages, userMessage]);
                invoke<AiResponse>("ask_ai", {
                    request: {
                        prompt: inputText,
                        conversation_id: conversationId,
                        assistant_id: +assistantId,
                        attachment_list: fileInfoList?.map((i) => i.id),
                    },
                }).then((res) => {
                    console.log("ask ai response", res);
                    if (unsubscribeRef.current) {
                        console.log(
                            "Unsubscribing from previous event listener",
                        );
                        unsubscribeRef.current.then((f) => f());
                    }

                    setMessageId(res.add_message_id);

                    if (conversationId != res.conversation_id + "") {
                        onChangeConversationId(res.conversation_id + "");
                    } else {
                        const assistantMessage = {
                            id: res.add_message_id,
                            conversation_id: conversationId
                                ? -1
                                : +conversationId,
                            llm_model_id: -1,
                            content: "",
                            token_count: 0,
                            message_type: "assistant",
                            created_time: new Date(),
                            attachment_list: [],
                            regenerate: null,
                        };

                        setMessages((prevMessages) => [
                            ...prevMessages,
                            assistantMessage,
                        ]);
                    }

                    console.log(
                        "Listening for response",
                        `message_${res.add_message_id}`,
                    );

                    unsubscribeRef.current = listen(
                        `message_${res.add_message_id}`,
                        (event) => {
                            const payload = event.payload as string;
                            if (payload !== "Tea::Event::MessageFinish") {
                                // 更新messages的最后一个对象
                                setMessages((prevMessages) => {
                                    const newMessages = [...prevMessages];
                                    const index = newMessages.findIndex(
                                        (msg) => msg.id === res.add_message_id,
                                    );
                                    if (index !== -1) {
                                        newMessages[index] = {
                                            ...newMessages[index],
                                            content: event.payload as string,
                                        };
                                        scroll();
                                    }
                                    return newMessages;
                                });
                            } else {
                                setAiIsResponsing(false);
                            }
                        },
                    );
                });
            } catch (error) {
                console.error("Error:", error);
            }
            setInputText("");
            setFileInfoList(null);
        }
    }, 200);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
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

    const filteredMessages = useMemo(
        () => messages.filter((m) => m.message_type !== "system"),
        [messages],
    );

    const [selectedAssistant, setSelectedAssistant] = useState(-1);

    const handleArtifact = useCallback((lang: string, inputStr: string) => {
        invoke("run_artifacts", { lang, inputStr }).then((res) => {
            console.log(res);
        });
    }, []);

    const [fileInfoList, setFileInfoList] = useState<Array<FileInfo> | null>(
        null,
    );
    const handleChooseFile = useCallback(async () => {
        try {
            const selected = await open({
                multiple: false,
            });

            if (selected) {
                const path = selected as string;
                const name =
                    path.split("\\").pop() || path.split("/").pop() || "";

                // 读取文件内容
                const contents = await readBinaryFile(path);

                // 如果是图片, 创建缩略图
                let thumbnail, type = AttachmentType.Text;
                if (name.match(/\.(jpg|jpeg|png|gif)$/)) {
                    const blob = new Blob([contents]);
                    thumbnail = URL.createObjectURL(blob);
                    type = AttachmentType.Image;
                }
                // TODO 这里还需要处理文件类型

                let newFile = { id: -1, name, path, thumbnail, type };
                setFileInfoList([...(fileInfoList || []), newFile]);

                // 调用Rust函数处理文件
                invoke<AddAttachmentResponse>("add_attachment", {
                    fileUrl: path,
                }).then((res) => {
                    newFile.id = res.attachment_id;
                });
            }
        } catch (error) {
            console.error("Error selecting file:", error);
        }
    }, [fileInfoList]);

    const handleDeleteFile = useCallback((fileId: number) => {
        setFileInfoList((prevList) =>
            prevList ? prevList.filter((file) => file.id !== fileId) : null,
        );
    }, []);

    const getAttachmentType = useCallback((fileType: string) => {
        if (fileType.startsWith('image/')) {
            return AttachmentType.Image;
        } else if (fileType === 'text/plain') {
            return AttachmentType.Text;
        } else {
            return AttachmentType.Text;
        }
    }, []);

    const onFilesSelect = useCallback((files: File[]) => {
        setIsDragging(false);
        const newFiles = files.filter(
            (file) =>
                file.type === "image/png" ||
                file.type === "image/jpeg" ||
                file.type === "image/gif" ||
                file.type === "text/plain",
        );

        const filePromises = newFiles.map(
            (file) =>
                new Promise<FileInfo>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const fileContent = event.target?.result;
                        if (typeof fileContent === "string") {
                            let newFile: FileInfo = {
                                id: -1,
                                name: file.name,
                                path: file.name,
                                type: getAttachmentType(file.type),
                                thumbnail: fileContent,
                            };
                            resolve(newFile);
                        } else {
                            reject(new Error("Failed to read file content"));
                        }
                    };
                    reader.onerror = (error) => {
                        console.error(
                            `Error reading file: ${file.name}`,
                            error,
                        );
                        reject(error);
                    };
                    if (file.type.startsWith('image/')) {
                        reader.readAsDataURL(file);
                    } else if (file.type === 'text/plain') {
                        reader.readAsText(file);
                    } else {
                        reader.readAsArrayBuffer(file);
                    }
                }),
        );

        Promise.all(filePromises)
            .then((newFileInfos) => {
                setFileInfoList((prev) => [...(prev || []), ...newFileInfos]);

                newFileInfos.forEach((fileInfo) => {
                    invoke<AddAttachmentResponse>("add_attachment_content", {
                        fileContent: fileInfo.thumbnail,
                        fileName: fileInfo.name,
                        attachmentType: fileInfo.type,
                    })
                        .then((res) => {
                            setFileInfoList(
                                (prev) =>
                                    prev?.map((f) =>
                                        f.name === fileInfo.name && f.id === -1
                                            ? { ...f, id: res.attachment_id }
                                            : f,
                                    ) || null,
                            );
                        })
                        .catch((error) =>
                            console.error(
                                `Error uploading file: ${fileInfo.name}`,
                                error,
                            ),
                        );
                });
            })
            .catch((error) => console.error("Error processing files:", error));
    }, []);

    // 文件拖拽处理
    const { isDragging, setIsDragging, dropRef } =
        useFileDropHandler(onFilesSelect);

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (e.clipboardData.files.length > 0) {
            onFilesSelect(Array.from(e.clipboardData.files));
        }
    };

    const [formDialogIsOpen, setFormDialogIsOpen] = useState<boolean>(false);
    const openFormDialog = useCallback(() => {
        setFormConversationTitle(conversation?.name || "");
        setFormDialogIsOpen(true);
    }, [conversation]);
    const closeFormDialog = useCallback(() => {
        setFormDialogIsOpen(false);
    }, []);
    const [formConversationTitle, setFormConversationTitle] =
        useState<string>("");

    const handleFormSubmit = useCallback(() => {
        invoke("update_conversation", {
            conversationId: conversation?.id,
            name: formConversationTitle,
        }).then(() => {
            closeFormDialog();
        });
    }, [conversation, formConversationTitle]);

    const { deleteConversation } = useConversationManager();
    const handleDeleteConversation = useCallback(() => {
        deleteConversation(conversationId, {
            onSuccess: () => {
                onChangeConversationId("");
            },
        });
    }, [conversationId]);

    const handleMessageRegenerate = useCallback(
        (regenerateMessageId: number) => {
            invoke<AiResponse>("regenerate_ai", {
                messageId: regenerateMessageId,
            }).then((res) => {
                console.log("regenerate ai response", res);

                const assistantMessage = {
                    id: res.add_message_id,
                    conversation_id: conversationId ? -1 : +conversationId,
                    llm_model_id: -1,
                    content: "",
                    token_count: 0,
                    message_type: "assistant",
                    created_time: new Date(),
                    attachment_list: [],
                    regenerate: null,
                };

                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    const index = newMessages.findIndex(
                        (msg) => msg.id === regenerateMessageId,
                    );
                    if (index !== -1) {
                        if (!newMessages[index].regenerate) {
                            newMessages[index].regenerate = [];
                        }
                        newMessages[index].regenerate.push(assistantMessage);
                    }
                    return newMessages;
                });

                console.log(
                    "Listening for response",
                    `message_${res.add_message_id}`,
                );

                unsubscribeRef.current = listen(
                    `message_${res.add_message_id}`,
                    (event) => {
                        const payload = event.payload as string;
                        console.log(payload);
                        if (payload !== "Tea::Event::MessageFinish") {
                            // 更新messages的最后一个对象
                            setMessages((prevMessages) => {
                                const newMessages = [...prevMessages];
                                const index = newMessages.findIndex(
                                    (msg) => msg.id === regenerateMessageId,
                                );
                                if (index !== -1) {
                                    const regenerateIndex =
                                        newMessages[
                                            index
                                        ].regenerate?.findIndex(
                                            (msg) =>
                                                msg.id === res.add_message_id,
                                        ) || -1;
                                    if (regenerateIndex !== -1) {
                                        const newRegenerate = [...newMessages[index].regenerate!];
                                        newRegenerate[regenerateIndex] = {
                                            ...newRegenerate[regenerateIndex],
                                            content: payload,
                                        };
                                        newMessages[index] = {
                                            ...newMessages[index],
                                            regenerate: newRegenerate,
                                        };
                                    }
                                }
                                return newMessages;
                            });
                        } else {
                            setAiIsResponsing(false);
                        }
                    },
                );
            });
        },
        [],
    );

    return (
        <div ref={dropRef} className="conversation-ui">
            {conversationId ? (
                <ConversationTitle
                    onEdit={openFormDialog}
                    onDelete={handleDeleteConversation}
                    conversation={conversation}
                />
            ) : null}

            <div className="messages">
                {conversationId ? (
                    filteredMessages.map((message, index) => (
                        <MessageItem
                            key={index}
                            message={message}
                            onCodeRun={handleArtifact}
                            onMessageRegenerate={() =>
                                handleMessageRegenerate(message.id)
                            }
                        />
                    ))
                ) : (
                    <NewChatComponent
                        selectedAssistant={selectedAssistant}
                        assistants={assistants}
                        setSelectedAssistant={setSelectedAssistant}
                    />
                )}
                <div className="message-anchor"></div>
                <div ref={messagesEndRef} />
            </div>
            {isDragging ? (
                <FileDropArea
                    onDragChange={setIsDragging}
                    onFilesSelect={onFilesSelect}
                />
            ) : null}

            <InputArea
                inputText={inputText}
                setInputText={setInputText}
                handleKeyDown={handleKeyDown}
                fileInfoList={fileInfoList}
                handleChooseFile={handleChooseFile}
                handleDeleteFile={handleDeleteFile}
                handlePaste={handlePaste}
                handleSend={handleSend}
                aiIsResponsing={aiIsResponsing}
            />

            <FormDialog
                title={"修改对话标题"}
                onSubmit={handleFormSubmit}
                onClose={closeFormDialog}
                isOpen={formDialogIsOpen}
            >
                <form className="form-group-container">
                    <div className="form-group">
                        <label>标题:</label>
                        <input
                            className="form-input"
                            type="text"
                            name="name"
                            value={formConversationTitle}
                            onChange={(e) =>
                                setFormConversationTitle(e.target.value)
                            }
                        />
                    </div>
                </form>
            </FormDialog>

            {isLoadingShow ? (
                <div className="loading">
                    <div className="loading-icon"></div>
                    <div className="loading-text">加载中...</div>
                </div>
            ) : null}
        </div>
    );
}

export default ConversationUI;
