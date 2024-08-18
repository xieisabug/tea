import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { confirm } from '@tauri-apps/api/dialog';
import { Conversation } from '../data/Conversation';

interface DeleteConversationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  confirmMessage?: string;
  confirmTitle?: string;
}

function useConversationManager() {
  const deleteConversation = useCallback(async (
    id: string,
    options: DeleteConversationOptions = {}
  ) => {
    const {
      onSuccess,
      onError,
      confirmMessage = '该动作不可逆，是否确认删除对话?',
      confirmTitle = '删除对话'
    } = options;

    try {
      const confirmed = await confirm(confirmMessage, { title: confirmTitle, type: 'warning' });
      if (!confirmed) return;

      await invoke("delete_conversation", { conversationId: id });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error('Failed to delete conversation:', error);
      }
    }
  }, []);

  const listConversations = useCallback(async (
    page: number = 1,
    pageSize: number = 100
  ): Promise<Conversation[]> => {
    return invoke<Array<Conversation>>("list_conversations", { page, pageSize });
  }, []);

  return {
    deleteConversation,
    listConversations
  };
}

export default useConversationManager;
