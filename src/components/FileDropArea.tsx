import React, { useState, useRef } from 'react';
import "../styles/FileDropArea.css"

interface FileDropAreaProps {
    onFilesSelect: (files: File[]) => void;
    onDragChange: (state: boolean) => void;
}

const FileDropArea: React.FC<FileDropAreaProps> = ({ onFilesSelect, onDragChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const dropRef = useRef<HTMLDivElement>(null);

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
            onDragChange(true);
        }
    };

    const handleDragOut = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onDragChange(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onDragChange(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            console.log(e.dataTransfer.files);
            const droppedFiles = Array.from(e.dataTransfer.files);
            setFiles(droppedFiles);
            onFilesSelect(droppedFiles);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div
            ref={dropRef}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className='file-drop-area'
            style={{
                backgroundColor: isDragging ? '#e6f7ff' : 'white',
            }}
        >
            {files.length > 0 ? (
                <div>
                    <p>Files uploaded:</p>
                    <ul>
                        {files.map((file, index) => (
                            <li key={index}>{file.name}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>{isDragging ? 'Drop files here' : 'Drag and drop files here'}</p>
            )}
        </div>
    );
};

export default FileDropArea;
