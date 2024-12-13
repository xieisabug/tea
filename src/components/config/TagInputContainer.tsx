import React, { useCallback } from 'react';
import TagInput from '../TagInput';
import { invoke } from "@tauri-apps/api/core";
import { toast } from 'sonner';

interface TagInputContainerProps {
    llmProviderId: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

const TagInputContainer: React.FC<TagInputContainerProps> = ({
    llmProviderId,
    tags,
    onTagsChange
}) => {
    console.log("TagInputContainer render", { tags });

    // 添加模型
    const handleAddTag = useCallback((tag: string) => {
        invoke<Array<LLMModel>>('add_llm_model', { code: tag, llmProviderId })
            .then(() => {
                console.log("添加模型成功");
                onTagsChange([...tags, tag]);
            })
            .catch((e) => {
                console.log(e);
                toast.error('添加模型失败' + e);
            });
    }, [llmProviderId, tags, onTagsChange]);

    // 移除模型
    const handleRemoveTag = useCallback((index: number) => {
        const tagToRemove = tags[index];
        invoke<Array<LLMModel>>('delete_llm_model', { code: tagToRemove, llmProviderId })
            .then(() => {
                console.log("删除模型成功");
                onTagsChange(tags.filter((_, i) => i !== index));
            })
            .catch((e) => {
                console.log(e);
                toast.error('删除模型失败' + e);
            });
    }, [llmProviderId, tags, onTagsChange]);

    return (
        <TagInput
            placeholder="输入自定义Model按回车确认"
            tags={tags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
        />
    );
};

export default React.memo(TagInputContainer);