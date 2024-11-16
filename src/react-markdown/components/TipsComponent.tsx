import React from "react";

interface TipsComponentProps {
    text: string;
}

const TipsComponent: React.FC<TipsComponentProps> = ({ text }) => {
    return (
        <div
            style={{
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "5px",
                backgroundColor: "#f9f9f9",
            }}
        >
            <strong>Tips:</strong> {text}
        </div>
    );
};

export default TipsComponent;
