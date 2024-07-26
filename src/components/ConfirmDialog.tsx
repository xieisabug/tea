// ConfirmDialog.tsx
import React from 'react';
import '../styles/ConfirmDialog.css';

interface ConfirmDialogProps {
    title: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    isOpen: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, confirmText, onConfirm, onCancel, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
                <h2 className="confirm-dialog-title">{title}</h2>
                <p className="confirm-dialog-text">{confirmText}</p>
                <div className="confirm-dialog-actions">
                    <button onClick={onCancel} className="confirm-dialog-button cancel">取消</button>
                    <button onClick={onConfirm} className="confirm-dialog-button confirm">确认</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;