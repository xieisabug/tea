import { MouseEventHandler, useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import MenuIcon from "../assets/menu.svg?react";
import IconButton from "./IconButton";
import FormDialog from "./FormDialog";
import useConversationManager from "../hooks/useConversationManager";
import { Conversation } from "../data/Conversation";

interface ConversationListProps {
    onSelectConversation: (conversation: string) => void;
    conversationId: string;
}

interface MenuProps {
    items: Array<{ label: string, onClick: MouseEventHandler<HTMLButtonElement> }>;
}

function Menu({ items }: MenuProps) {
    return (
        <div
            className="conversation-menu"
        >
            {
                items.map((item) => {
                    return <button key={item.label} className="conversation-menu-item" onClick={item.onClick}>{item.label}</button>
                })
            }
        </div>
    );
};

function ConversationList({ onSelectConversation, conversationId }: ConversationListProps) {
    const [conversations, setConversations] = useState<Array<Conversation>>([]);
    const {deleteConversation, listConversations} = useConversationManager();

    useEffect(() => {
        listConversations()
            .then(c => {
                setConversations(c);
            });
    }, []);

    useEffect(() => {
        // Fetch conversations from the server
        if (conversations.findIndex((conversation) => conversation.id.toString() === conversationId) === -1) {
            listConversations()
                .then(c => {
                    setConversations(c);
                });
        }
    }, [conversationId]);

    useEffect(() => {
        const unsubscribe = listen("title_change", (event) => {
            const [conversationId, title] = event.payload as [string, string];

            const index = conversations.findIndex((conversation) => conversation.id.toString() == conversationId);
            if (index !== -1) {
                const newConversations = [...conversations];
                newConversations[index] = { ...newConversations[index], name: title };
                setConversations(newConversations);
            }
        });

        const index = conversations.findIndex(c => conversationId == c.id.toString());
        if (index === -1) {
            onSelectConversation("");
        }

        return () => {
            if (unsubscribe) {
                unsubscribe.then((f) => f());
            }
        };
    }, [conversations]);

    const handleDeleteConversation = useCallback(async (id: string) => {
        await deleteConversation(id, {
            onSuccess: async () => {
                const conversations = await listConversations();
                setConversations(conversations);
            }
        });
    }, []);

    const [menuShow, setMenuShow] = useState(false);
    const [menuShowConversationId, setMenuShowConversationId] = useState("");

    const onMenuClick = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>, conversationId: string) => {
        e.stopPropagation();
        setMenuShow(true);
        setMenuShowConversationId(conversationId);
    }, []);

    useEffect(() => {
        const handleOutsideClick = () => {
            if (menuShow) {
                setMenuShow(false);
            }
        };
    
        document.addEventListener('click', handleOutsideClick);
    
        return () => {
          document.removeEventListener('click', handleOutsideClick);
        };
    }, [menuShow, onMenuClick]);

    const [formDialogIsOpen, setFormDialogIsOpen] = useState<boolean>(false);
    const openFormDialog = useCallback((title: string) => {
        setFormConversationTitle(title || "");
        setFormDialogIsOpen(true);
    }, []);
    const closeFormDialog = useCallback(() => {
        setFormDialogIsOpen(false);
    }, []);
    const [formConversationTitle, setFormConversationTitle] = useState<string>("");

    const handleFormSubmit = useCallback(() => {
        invoke("update_conversation", { conversationId: menuShowConversationId, name: formConversationTitle }).then(() => {
            const newConversations = 
                conversations.map((conversation) => {
                    if (conversation.id.toString() === menuShowConversationId) {
                        return { ...conversation, name: formConversationTitle };
                    }
                    return conversation;
                });
            setConversations(newConversations);
            closeFormDialog();
        })
    }, [menuShowConversationId, formConversationTitle]);

    return (
        <div className="conversation-list">
            <ul>
                {conversations.map((conversation) => (
                    <li className={`conversation-item ${conversationId == conversation.id.toString() ? "selected" : ""}`} key={conversation.id} onClick={() => {
                        onSelectConversation(conversation.id.toString());
                    }}>
                        <div className="conversation-list-item-name">{conversation.name}</div>
                        <div className="conversation-list-item-assistant-name">{conversation.assistant_name}</div>

                        <IconButton className="conversation-menu-icon" icon={<MenuIcon fill={conversationId == conversation.id.toString() ? "#468585": "black"} />} onClick={(e) => onMenuClick(e, conversation.id.toString())} />

                        {
                            menuShow && menuShowConversationId === conversation.id.toString() ? 
                                <Menu items={[
                                    {label: "编辑", onClick: (e) => {e.stopPropagation(); setMenuShow(false); openFormDialog(conversation.name);}},
                                    {label: "删除", onClick: (e) => {e.stopPropagation(); handleDeleteConversation(conversation.id.toString());}},
                                ]} /> : null
                        }
                    </li>
                ))}
            </ul>

            <FormDialog
                title={"修改对话标题"}
                onSubmit={handleFormSubmit}
                onClose={closeFormDialog}
                isOpen={formDialogIsOpen}
            >
                <form className='form-group-container'>
                    <div className='form-group'>
                        <label>标题:</label>
                        <input className='form-input' type="text" name="name" value={formConversationTitle} onChange={e => setFormConversationTitle(e.target.value)} />
                    </div>
                </form>
            </FormDialog>
        </div>
    );
}

export default ConversationList;
