import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import './TagInput.css';

// 定义TagInputProps接口
interface TagInputProps {
    tags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (index: number) => void;
}

// TagInput组件
const TagInput: React.FC<TagInputProps> = ({ tags, onAddTag, onRemoveTag }) => {
    const [inputValue, setInputValue] = useState<string>('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            onAddTag(inputValue.trim());
            setInputValue('');
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    return (
        <div className="tag-input-container">
            <div className="tags-container">
                {tags.map((tag, index) => (
                    <span key={index} className="tag">
            {tag}
                        <button onClick={() => onRemoveTag(index)} className="tag-close">
              &times;
            </button>
          </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag and press Enter"
                className="tag-input"
            />
        </div>
    );
};

export default TagInput;
