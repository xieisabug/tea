import { useState, useRef, useCallback, useEffect } from "react";

const useFileDropHandler = (onFilesSelect: (files: File[]) => void) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragCounter = useRef<number>(0);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelect(Array.from(e.dataTransfer.files));
        }
    }, [onFilesSelect]);

    const dropRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const div = dropRef.current;
        if (div) {
            div.addEventListener('dragenter', handleDragEnter as any);
            div.addEventListener('dragleave', handleDragLeave as any);
            div.addEventListener('dragover', handleDragOver as any);
            div.addEventListener('drop', handleDrop as any);
        }

        return () => {
            if (div) {
                div.removeEventListener('dragenter', handleDragEnter as any);
                div.removeEventListener('dragleave', handleDragLeave as any);
                div.removeEventListener('dragover', handleDragOver as any);
                div.removeEventListener('drop', handleDrop as any);
            }
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    return { isDragging, setIsDragging, dropRef, handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
};

export default useFileDropHandler;