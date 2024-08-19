import React from "react";
import CircleButton from "../CircleButton";
import Add from "../../assets/add.svg?react";
import Stop from "../../assets/stop.svg?react";
import UpArrow from "../../assets/up-arrow.svg?react";
import Delete from "../../assets/delete.svg?react";
import { FileInfo } from "../../data/Conversation";
import IconButton from "../IconButton";

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
}> = React.memo(({ inputText, setInputText, handleKeyDown, fileInfoList, handleChooseFile, handlePaste, handleDeleteFile, handleSend, aiIsResponsing }) => (
    <div className="input-area">
        <div className="input-area-img-container">
            {fileInfoList?.map((fileInfo) => (
                fileInfo.thumbnail && (
                    <div key={fileInfo.name + fileInfo.id} className="input-area-img-wrapper">
                        <img src={fileInfo.thumbnail} alt="缩略图" className="input-area-img" />
                        <IconButton border icon={<Delete fill="black" />} className="input-area-img-delete-button" onClick={() => {handleDeleteFile(fileInfo.id)}} />
                    </div>
                )
            ))}
        </div>
        <textarea
            className="input-area-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
        />
        <CircleButton onClick={handleChooseFile} icon={<Add fill="black" />} className="input-area-add-button" />
        <CircleButton size="large" onClick={handleSend} icon={aiIsResponsing ? <Stop width={20} height={20} fill="white" /> : <UpArrow width={20} height={20} fill="white" />} primary className="input-area-send-button" />
    </div>
));

export default InputArea;