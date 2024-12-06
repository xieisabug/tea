import React from "react";

interface TipsComponentProps {
    text: string;
}

const TipsComponent: React.FC<TipsComponentProps> = ({ text }) => {
    return (
        <div className="border border-gray-300 p-2.5 rounded bg-gray-50">
            <strong>Tips:</strong> {text}
        </div>
    );
};

export default TipsComponent;
