import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "./styles/AskWindow.css";
import ReactMarkdown, { Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";

import UpArrow from "./assets/up-arrow.svg?react";
import Stop from "./assets/stop.svg?react";
import Copy from "./assets/copy.svg?react";
import Ok from "./assets/ok.svg?react";
import OpenFullUI from "./assets/open-fullui.svg?react";
import Setting from "./assets/setting.svg?react";
import Add from "./assets/add.svg?react";
import AskWindowPrepare from "./components/AskWindowPrepare";
import AskAIHint from "./components/AskAIHint";
import IconButton from "./components/IconButton";
import { throttle } from "lodash";
import { writeText } from "@tauri-apps/api/clipboard";
import CodeBlock from "./components/CodeBlock";
import { getCaretCoordinates } from "./utils/caretCoordinates";

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}
interface CustomComponents extends Components {
    antthinking: React.ElementType;
}

interface AiResponse {
    conversation_id: number;
    add_message_id: number;
}
interface CustomComponents extends Components {
    antthinking: React.ElementType;
}

function AskWindow() {
    const [query, setQuery] = useState<string>("");
    const [response, setResponse] = useState<string>("");
    const [messageId, setMessageId] = useState<number>(-1);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [aiIsResponsing, setAiIsResponsing] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [bangListVisible, setBangListVisible] = useState<boolean>(false);
    const [bangList, setBangList] = useState<string[]>([]);
    const [originalBangList, setOriginalBangList] = useState<string[]>([]);
    const [selectedText, setSelectedText] = useState<string>("");

    const [cursorPosition, setCursorPosition] = useState<{
        top: number;
        left: number;
    }>({ top: 0, left: 0 });
    const [selectedBangIndex, setSelectedBangIndex] = useState<number>(0);

    let unsubscribe: Promise<() => void> | null = null;

    useEffect(() => {
        invoke<string>("get_selected_text_api").then((text) => {
            console.log("get_selected_text_api", text);
            setSelectedText(text);
        });

        listen<string>("get_selected_text_event", (event) => {
            console.log("get_selected_text_event", event.payload);
            setSelectedText(event.payload);
        });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setQuery(newValue);

        // Check for bang input
        const bangIndex = Math.max(
            newValue.lastIndexOf("!", cursorPosition - 1),
            newValue.lastIndexOf("！", cursorPosition - 1)
        );

        if (bangIndex !== -1 && bangIndex < cursorPosition) {
            const bangInput = newValue
                .substring(bangIndex + 1, cursorPosition)
                .toLowerCase();
            const filteredBangs = originalBangList.filter(([bang]) =>
                bang.toLowerCase().startsWith(bangInput),
            );

            if (filteredBangs.length > 0) {
                setBangList(filteredBangs);
                setSelectedBangIndex(0);
                setBangListVisible(true);

                // Update cursor position
                const textarea = e.target;
                const cursorPosition = textarea.selectionStart;
                const cursorCoords = getCaretCoordinates(
                    textarea,
                    cursorPosition,
                );
                const rect = textarea.getBoundingClientRect();
                const style = window.getComputedStyle(textarea);
                const paddingTop = parseFloat(style.paddingTop);
                const paddingBottom = parseFloat(style.paddingBottom);
                const textareaHeight = parseFloat(style.height);

                console.log(rect, paddingTop, paddingBottom, textareaHeight)
                // 计算bang列表的位置
                const left = rect.left + cursorCoords.cursorLeft;
                const top = rect.top + rect.height + Math.min(textareaHeight, cursorCoords.cursorTop) - paddingTop - paddingBottom;
                setCursorPosition({ top, left });
            } else {
                setBangListVisible(false);
            }
        } else {
            setBangListVisible(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                // Shift + Enter for new line
                return;
            } else if (bangListVisible) {
                // Select bang
                e.preventDefault();
                const selectedBang = bangList[selectedBangIndex];

                const textarea = e.currentTarget as HTMLTextAreaElement;
                const cursorPosition = textarea.selectionStart;
                const bangIndex = Math.max(
                    textarea.value.lastIndexOf("!", cursorPosition - 1),
                    textarea.value.lastIndexOf("！", cursorPosition - 1)
                );

                if (bangIndex !== -1) {
                    const beforeBang = textarea.value.substring(0, bangIndex);
                    const afterBang = textarea.value.substring(cursorPosition);
                    setQuery(
                        beforeBang + "!" + selectedBang[0] + " " + afterBang,
                    );

                    // 设置光标位置
                    setTimeout(() => {
                        const newPosition =
                            bangIndex + selectedBang[0].length + 2;
                        textarea.setSelectionRange(newPosition, newPosition);
                    }, 0);
                }
                setBangListVisible(false);
            } else {
                // Enter for submit
                e.preventDefault();
                handleSubmit();
            }
        } else if (e.key === "Tab" && bangListVisible) {
            // Select bang
            e.preventDefault();
            const selectedBang = bangList[selectedBangIndex];
            const textarea = e.currentTarget as HTMLTextAreaElement;
            const cursorPosition = textarea.selectionStart;
            const bangIndex = Math.max(
                textarea.value.lastIndexOf("!", cursorPosition - 1),
                textarea.value.lastIndexOf("！", cursorPosition - 1)
            );

            if (bangIndex !== -1) {
                const beforeBang = textarea.value.substring(0, bangIndex);
                const afterBang = textarea.value.substring(cursorPosition);
                setQuery(beforeBang + "!" + selectedBang[0] + " " + afterBang);

                // 设置光标位置
                setTimeout(() => {
                    const newPosition = bangIndex + selectedBang[0].length + 2;
                    textarea.setSelectionRange(newPosition, newPosition);
                }, 0);
            }

            setBangListVisible(false);
        } else if (e.key === "ArrowUp" && bangListVisible) {
            e.preventDefault();
            setSelectedBangIndex((prevIndex) =>
                prevIndex > 0 ? prevIndex - 1 : bangList.length - 1,
            );
        } else if (e.key === "ArrowDown" && bangListVisible) {
            e.preventDefault();
            setSelectedBangIndex((prevIndex) =>
                prevIndex < bangList.length - 1 ? prevIndex + 1 : 0,
            );
        } else if (e.key === "Escape") {
            e.preventDefault();
            setBangListVisible(false);
        }
    };

    function scrollToSelectedBang() {
        const selectedBangElement = document.querySelector(
            ".completion-bang-container.selected",
        );
        if (selectedBangElement) {
            const parentElement = selectedBangElement.parentElement;
            if (parentElement) {
                const parentRect = parentElement.getBoundingClientRect();
                const selectedRect =
                    selectedBangElement.getBoundingClientRect();

                if (selectedRect.top < parentRect.top) {
                    parentElement.scrollTop -=
                        parentRect.top - selectedRect.top;
                } else if (selectedRect.bottom > parentRect.bottom) {
                    parentElement.scrollTop +=
                        selectedRect.bottom - parentRect.bottom;
                }
            }
        }
    }

    useEffect(() => {
        scrollToSelectedBang();
    }, [selectedBangIndex]);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (inputRef.current) {
                const cursorPosition = inputRef.current.selectionStart;
                const value = inputRef.current.value;
                const bangIndex = Math.max(
                    value.lastIndexOf("!", cursorPosition - 1),
                    value.lastIndexOf("！", cursorPosition - 1)
                );
                if (bangIndex !== -1 && bangIndex < cursorPosition) {
                    const bangInput = value
                        .substring(bangIndex + 1, cursorPosition)
                        .toLowerCase();
                    const filteredBangs = originalBangList.filter(([bang]) =>
                        bang.toLowerCase().startsWith(bangInput),
                    );

                    if (filteredBangs.length > 0) {
                        setBangList(filteredBangs);
                        setSelectedBangIndex(0);
                        setBangListVisible(true);

                        const cursorCoords = getCaretCoordinates(
                            inputRef.current,
                            bangIndex + 1,
                        );
                        const rect = inputRef.current.getBoundingClientRect();
                        const style = window.getComputedStyle(inputRef.current);
                        const paddingTop = parseFloat(style.paddingTop);
                        const paddingBottom = parseFloat(style.paddingBottom);
                        const textareaHeight = parseFloat(style.height);

                        // 计算bang列表的位置
                        const left = rect.left + cursorCoords.cursorLeft;
                        const top = rect.top + rect.height + Math.min(textareaHeight, cursorCoords.cursorTop) - paddingTop - paddingBottom;
                        setCursorPosition({ top, left });
                    } else {
                        setBangListVisible(false);
                    }
                } else {
                    setBangListVisible(false);
                }
            }
        };

        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener(
                "selectionchange",
                handleSelectionChange,
            );
        };
    }, [originalBangList]);

    const handleSubmit = () => {
        if (aiIsResponsing) {
            return;
        }
        setAiIsResponsing(true);
        setResponse("");
        try {
            invoke<AiResponse>("ask_ai", {
                request: {
                    prompt: query,
                    conversation_id: "",
                    assistant_id: 1,
                },
            }).then((res) => {
                setMessageId(res.add_message_id);

                console.log("ask ai response", res);
                if (unsubscribe) {
                    console.log("Unsubscribing from previous event listener");
                    unsubscribe.then((f) => f());
                }

                console.log(
                    "Listening for response",
                    `message_${res.add_message_id}`,
                );
                unsubscribe = listen(
                    `message_${res.add_message_id}`,
                    (event) => {
                        const payload = event.payload as string;
                        if (payload !== "Tea::Event::MessageFinish") {
                            setResponse(payload);
                        } else {
                            setAiIsResponsing(false);
                        }
                    },
                );
            });
        } catch (error) {
            console.error("Error:", error);
            setResponse("An error occurred while processing your request.");
        }
    };

    const onSend = throttle(() => {
        if (aiIsResponsing) {
            console.log("Cancelling AI");
            invoke("cancel_ai", { messageId }).then(() => {
                setAiIsResponsing(false);
            });
        } else {
            console.log("Sending query to AI");
            handleSubmit();
        }
    }, 200);

    useEffect(() => {
        const handleShortcut = async (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                console.log("Closing window");
                await appWindow.hide();
            } else if (event.key === "i" && event.ctrlKey) {
                await openChatUI();
                await appWindow.hide();
            }
        };

        if (inputRef.current) {
            inputRef.current.focus();
        }

        window.addEventListener("keydown", handleShortcut);

        return () => {
            window.removeEventListener("keydown", handleShortcut);
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, []);

    const openConfig = async () => {
        await invoke("open_config_window");
    };

    const openChatUI = async () => {
        await invoke("open_chat_ui_window");
    };

    const handleArtifact = useCallback((lang: string, inputStr: string) => {
        invoke("run_artifacts", { lang, inputStr }).then((res) => {
            console.log(res);
        });
    }, []);

    useEffect(() => {
        invoke<string[]>("get_bang_list").then((bangList) => {
            setBangList(bangList);
            setOriginalBangList(bangList);
        });
    }, []);

    const startNewConversation = () => {
        setQuery("");
        setResponse("");
        setMessageId(-1);
        setAiIsResponsing(false);
    };

    return (
        <div className="ask-window">
            <div className="chat-container" data-tauri-drag-region>
                <div className="ask-window-chat-form">
                    <textarea
                        className="ask-window-input"
                        ref={inputRef}
                        value={query}
                        onKeyDown={handleKeyDown}
                        onChange={handleInputChange}
                        placeholder="Ask AI..."
                    ></textarea>
                    <button
                        className="ask-window-submit-button"
                        type="button"
                        onClick={onSend}
                    >
                        {aiIsResponsing ? (
                            <Stop fill="white" />
                        ) : (
                            <UpArrow fill="white" />
                        )}
                    </button>
                </div>
                <div className="response">
                    {messageId !== -1 ? (
                        response == "" ? (
                            <AskAIHint />
                        ) : (
                            <ReactMarkdown
                                children={response}
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={
                                    {
                                        code({
                                            node,
                                            className,
                                            children,
                                            ref,
                                            ...props
                                        }) {
                                            const match = /language-(\w+)/.exec(
                                                className || "",
                                            );
                                            return match ? (
                                                <CodeBlock
                                                    language={match[1]}
                                                    onCodeRun={handleArtifact}
                                                >
                                                    {String(children).replace(
                                                        /\n$/,
                                                        "",
                                                    )}
                                                </CodeBlock>
                                            ) : (
                                                <code
                                                    {...props}
                                                    ref={ref}
                                                    className={className}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        },
                                        antthinking({ children }) {
                                            return (
                                                <div>
                                                    <div
                                                        className="llm-thinking-badge"
                                                        title={children}
                                                        data-thinking={children}
                                                    >
                                                        思考...
                                                    </div>
                                                </div>
                                            );
                                        },
                                    } as CustomComponents
                                }
                            />
                        )
                    ) : (
                        <AskWindowPrepare selectedText={selectedText} />
                    )}
                </div>
                <div className="tools" data-tauri-drag-region>
                    {messageId !== -1 && !aiIsResponsing && (
                        <IconButton
                            icon={<Add fill="black" />}
                            onClick={startNewConversation}
                        />
                    )}
                    {messageId !== -1 && !aiIsResponsing ? (
                        <IconButton
                            icon={
                                copySuccess ? (
                                    <Ok fill="black" />
                                ) : (
                                    <Copy fill="black" />
                                )
                            }
                            onClick={() => {
                                writeText(response);
                                setCopySuccess(true);
                                setTimeout(() => {
                                    setCopySuccess(false);
                                }, 1500);
                            }}
                        />
                    ) : null}

                    <IconButton
                        icon={<OpenFullUI fill="black" />}
                        onClick={openChatUI}
                    />
                    <IconButton
                        icon={<Setting fill="black" />}
                        onClick={openConfig}
                    />
                </div>
                {bangListVisible && (
                    <div
                        className="completion-bang-list"
                        style={{
                            top: cursorPosition.top,
                            left: cursorPosition.left,
                        }}
                    >
                        {bangList.map(([bang, desc], index) => (
                            <div
                                className={`completion-bang-container ${index === selectedBangIndex ? "selected" : ""}`}
                                key={bang}
                                onClick={() => {
                                    const textarea = inputRef.current;
                                    if (textarea) {
                                        const cursorPosition = textarea.selectionStart;
                                        const bangIndex = Math.max(
                                            textarea.value.lastIndexOf("!", cursorPosition - 1),
                                            textarea.value.lastIndexOf("！", cursorPosition - 1)
                                        );

                                        if (bangIndex !== -1) {
                                            const newValue =
                                                textarea.value.substring(0, bangIndex + 1) +
                                                bang +
                                                " " +
                                                textarea.value.substring(cursorPosition);
                                            setQuery(newValue);
                                            setBangListVisible(false);
                                            // 再次聚焦到textarea输入框并设置光标位置
                                            textarea.focus();
                                            textarea.setSelectionRange(bangIndex + bang.length + 2, bangIndex + bang.length + 2);
                                        }
                                    }
                                }}
                            >
                                <span className="bang-tag">{bang}</span>
                                <span>{desc}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AskWindow;
