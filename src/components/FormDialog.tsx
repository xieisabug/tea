// FormDialog.tsx
import React from 'react';
import '../styles/FormDialog.css';

interface FormDialogProps {
    title: string;
    onSubmit: () => void;
    onClose: () => void;
    isOpen: boolean;
    children: React.ReactNode;
}

const FormDialog: React.FC<FormDialogProps> = ({ title, onSubmit, onClose, isOpen, children }) => {
    if (!isOpen) return null;

    return (
        <div className="form-dialog-overlay">
            <div className="form-dialog">
                <h2 className="form-dialog-title">{title}</h2>
                <div className="form-dialog-content">
                    {children}
                </div>
                <div className="form-dialog-actions">
                    <button onClick={onClose} className="form-dialog-button cancel">关闭</button>
                    <button onClick={onSubmit} className="form-dialog-button submit">提交</button>
                </div>
            </div>
        </div>
    );
};

export default FormDialog;