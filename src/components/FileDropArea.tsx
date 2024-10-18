import React, { useState, useCallback } from "react";
import "../styles/FileDropArea.css";

interface FileDropAreaProps {
    onFilesSelect: (files: File[]) => void;
    onDragChange: (state: boolean) => void;
    acceptedFileTypes?: string[];
    maxFileSize?: number;
}

const FileDropArea: React.FC<FileDropAreaProps> = ({
    onFilesSelect,
    onDragChange,
    acceptedFileTypes = [],
    maxFileSize = Infinity,
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragChange = useCallback(
        (e: React.DragEvent<HTMLDivElement>, isDragIn: boolean) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(isDragIn);
            onDragChange(isDragIn);
        },
        [onDragChange],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            onDragChange(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const droppedFiles = Array.from(e.dataTransfer.files).filter(
                    (file) => {
                        if (
                            acceptedFileTypes.length &&
                            !acceptedFileTypes.includes(file.type)
                        ) {
                            console.warn(
                                `File type ${file.type} is not accepted`,
                            );
                            return false;
                        }
                        if (file.size > maxFileSize) {
                            console.warn(
                                `File ${file.name} exceeds maximum size`,
                            );
                            return false;
                        }
                        return true;
                    },
                );
                onFilesSelect(droppedFiles);
                e.dataTransfer.clearData();
            }
        },
        [onDragChange, onFilesSelect, acceptedFileTypes, maxFileSize],
    );

    return (
        <div
            onDragEnter={(e) => handleDragChange(e, true)}
            onDragLeave={(e) => handleDragChange(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="file-drop-area"
            style={{
                backgroundColor: isDragging ? "#e6f7ff" : "white",
            }}
        >
            <p>{isDragging ? "拖拽文件后上传" : "将文件拖拽到此处"}</p>
        </div>
    );
};

export default FileDropArea;
