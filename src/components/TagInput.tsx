import React, { useState, KeyboardEvent, ChangeEvent, useCallback } from 'react';
import '../styles/TagInput.css';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge'; // 导入 Shadcn 的 Badge 组件

// 定义TagInputProps接口
interface TagInputProps {
    tags: string[];
    placeholder?: string;
    onAddTag: (tag: string) => void;
    onRemoveTag: (index: number) => void;
}

// TagInput组件
const TagInput: React.FC<TagInputProps> = ({ tags, placeholder, onAddTag, onRemoveTag }) => {
    const [inputValue, setInputValue] = useState<string>('');

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            console.log("TagInput handleKeyDown", inputValue);
            onAddTag(inputValue.trim());
            setInputValue('');
        }
    }, [inputValue, onAddTag]);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    return (
        <div className="tag-input-container grid">
            <div className="tags-container gap-1">
                {tags.map((tag, index) => (
                    <Badge key={index} >
                        {tag}
                        <Button variant="ghost" className="h-4 w-4 p-0 hover:bg-transparent" size="sm" onClick={() => onRemoveTag(index)}>
                            &times;
                        </Button>
                    </Badge>
                ))}
            </div>
            <Input
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
            // className="form-input tag-input"
            />
        </div>
    );
};

export default TagInput;
