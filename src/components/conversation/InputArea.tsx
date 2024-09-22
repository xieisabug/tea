import React, { useRef, useEffect, useState } from "react";
import CircleButton from "../CircleButton";
import Add from "../../assets/add.svg?react";
import Stop from "../../assets/stop.svg?react";
import UpArrow from "../../assets/up-arrow.svg?react";
import Delete from "../../assets/delete.svg?react";
import Text from "../../assets/text.svg?react";
import { AttachmentType, FileInfo } from "../../data/Conversation";
import IconButton from "../IconButton";
import { invoke } from "@tauri-apps/api/tauri";

const InputArea: React.FC<{
    inputText: string;
    setInputText: (text: string) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    fileInfoList: FileInfo[] | null;
    handleChooseFile: () => void;
    handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    handleDeleteFile: (fileId: number) => void;
    handleSend: () => void;
    aiIsResponsing: boolean;
}> = React.memo(({ inputText, setInputText, handleKeyDown, fileInfoList, handleChooseFile, handlePaste, handleDeleteFile, handleSend, aiIsResponsing }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [initialHeight, setInitialHeight] = useState<number | null>(null);
    const [bangListVisible, setBangListVisible] = useState<boolean>(false);
    const [bangList, setBangList] = useState<string[]>([]);

    useEffect(() => {
        if (textareaRef.current && !initialHeight) {
            setInitialHeight(textareaRef.current.scrollHeight);
        }
        adjustTextareaHeight();
    }, [inputText, initialHeight]);

    useEffect(() => {
        invoke<string[]>("get_bang_list").then((bangList) => {
            setBangList(bangList);
        });
    }, []);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea && initialHeight) {
            textarea.style.height = `${initialHeight}px`;
            const maxHeight = document.documentElement.clientHeight * 0.4;
            const newHeight = Math.min(Math.max(textarea.scrollHeight, initialHeight), maxHeight);
            textarea.style.height = `${newHeight}px`;
            textarea.parentElement!.style.height = `${newHeight}px`;
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
    };

    const handleKeyDownWithBang = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        handleKeyDown(e);
        if (e.key === "!") {
            setBangListVisible(true);
        } else {
            setBangListVisible(false);
        }
    };

    return (
        <div className="input-area">
            <div className="input-area-img-container">
                {fileInfoList?.map((fileInfo) => (
                    <div key={fileInfo.name + fileInfo.id} className={
                        fileInfo.type === AttachmentType.Image ? "input-area-img-wrapper" : "input-area-text-wrapper"
                    }>
                        {(() => {
                            switch (fileInfo.type) {
                                case AttachmentType.Image:
                                    return <img src={fileInfo.thumbnail} alt="缩略图" className="input-area-img" />;
                                case AttachmentType.Text:
                                    return [<Text fill="black" />, <span title={fileInfo.name}>{fileInfo.name}</span>];
                                case AttachmentType.PDF:
                                    return <span title={fileInfo.name}>{fileInfo.name} (PDF)</span>;
                                case AttachmentType.Word:
                                    return <span title={fileInfo.name}>{fileInfo.name} (Word)</span>;
                                case AttachmentType.PowerPoint:
                                    return <span title={fileInfo.name}>{fileInfo.name} (PowerPoint)</span>;
                                case AttachmentType.Excel:
                                    return <span title={fileInfo.name}>{fileInfo.name} (Excel)</span>;
                                default:
                                    return <span title={fileInfo.name}>{fileInfo.name}</span>;
                            }
                        })()}
                        <IconButton border icon={<Delete fill="black" />} className="input-area-img-delete-button" onClick={() => {handleDeleteFile(fileInfo.id)}} />
                    </div>
                ))}
            </div>
            <div className="input-area-textarea-container">
                <textarea
                    ref={textareaRef}
                    className="input-area-textarea"
                    rows={1}
                    value={inputText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDownWithBang}
                    onPaste={handlePaste}
                />
            </div>
            
            <CircleButton onClick={handleChooseFile} icon={<Add fill="black" />} className="input-area-add-button" />
            <CircleButton size="large" onClick={handleSend} icon={aiIsResponsing ? <Stop width={20} height={20} fill="white" /> : <UpArrow width={20} height={20} fill="white" />} primary className="input-area-send-button" />

            {bangListVisible && (
                <div className="bang-list">
                    {bangList.map((bang) => (
                        <div className="bang-container" key={bang}>
                            <span className="bang-tag">{bang}</span>
                            <span>插入{bang}命令</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default InputArea;
