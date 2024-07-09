import React, {useEffect, useState} from 'react';
import './TagInput.css'; // 引入样式文件

interface Props {
    value: string;
}

interface Tag {
    id: number;
    text: string;
}

const TagInput: React.FC<Props> = ({ value }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [inputValue, setInputValue] = useState<string>('');

    useEffect(() => {
        console.log("value change", value)
        const tagList = value.split(',').map((tagText, index) => {
            return {id: index, text: tagText}
        });
        setTags(tagList);
    }, [value]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && inputValue.trim()) {
            event.preventDefault();
            const newTag: Tag = { id: Date.now(), text: inputValue.trim() };
            setTags([...tags, newTag]);
            setInputValue('');
        }
    };

    const handleTagRemove = (id: number) => {
        setTags(tags.filter(tag => tag.id !== id));
    };

    return (
        <div className="tag-input-container">
            <div className="tags">
                {tags.map(tag => (
                    <div key={tag.id} className="tag">
                        {tag.text}
                        <button onClick={() => handleTagRemove(tag.id)} className="tag-close">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="input-field"
                placeholder="输入内容后按回车添加tag"
            />
        </div>
    );
};

export default TagInput;