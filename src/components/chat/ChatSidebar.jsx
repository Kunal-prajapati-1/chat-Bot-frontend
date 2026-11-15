
import React, { useState } from "react";
import "./ChatSidebar.css";

const ChatSidebar = ({
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onLogin,
  onSignup,
  onRenameChat,
  onDeleteChat,
  onReorderChats,
  authStatus,
  open,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [draggedId, setDraggedId] = useState(null);

  const beginRename = (chat) => {
    setEditingId(String(chat.id ?? chat._id));
    setEditTitle(chat.title || "New Chat");
  };

  const saveRename = async (chat) => {
    const id = String(chat.id ?? chat._id);
    const title = editTitle.trim();

    if (!title || title.length > 100) return;

    await onRenameChat?.(id, title, chat);
    setEditingId(null);
  };

  const confirmDelete = async (chat) => {
    const title = chat.title || "New Chat";
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThis will permanently delete this chat and its saved messages.`
    );

    if (!confirmed) return;

    await onDeleteChat?.(String(chat.id ?? chat._id), chat);
  };

  const handleDrop = async (targetId) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const reordered = [...chats];
    const from = reordered.findIndex(
      (chat) => String(chat.id ?? chat._id) === draggedId
    );
    const to = reordered.findIndex(
      (chat) => String(chat.id ?? chat._id) === targetId
    );

    if (from !== -1 && to !== -1) {
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      await onReorderChats?.(
        reordered.map((chat) => String(chat.id ?? chat._id))
      );
    }

    setDraggedId(null);
  };

  return (
    <aside
      className={"chat-sidebar " + (open ? "open" : "")}
      aria-label="Chat sidebar"
    >
      <div className="sidebar-header">
        <h2>Chats</h2>
        <button className="small-btn" onClick={onNewChat}>
          + New
        </button>
      </div>

      <nav className="chat-list" aria-live="polite">
        {chats.map((chat) => {
          const id = String(chat.id ?? chat._id);
          const active = id === String(activeChatId);
          const editing = editingId === id;

          return (
            <div
              key={id}
              className={
                "chat-list-item " +
                (active ? "active " : "") +
                (draggedId === id ? "dragging" : "")
              }
              draggable={!editing}
              onDragStart={(event) => {
                setDraggedId(id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(id);
              }}
              onDragEnd={() => setDraggedId(null)}
            >
              {editing ? (
                <form
                  className="chat-rename-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveRename(chat);
                  }}
                >
                  <input
                    autoFocus
                    maxLength={100}
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    aria-label="Chat title"
                  />
                  <button type="submit" title="Save title">Save</button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    title="Cancel rename"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="chat-title-button"
                    onClick={() => onSelectChat(id)}
                    title={chat.title || "New Chat"}
                  >
                    <span className="drag-handle" aria-hidden="true">⠿</span>
                    <span className="title-line">
                      {chat.title || "New Chat"}
                    </span>
                  </button>

                  <div className="chat-actions">
                    <button
                      type="button"
                      title="Rename chat"
                      aria-label={`Rename ${chat.title || "New Chat"}`}
                      onClick={() => beginRename(chat)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title="Delete chat"
                      aria-label={`Delete ${chat.title || "New Chat"}`}
                      onClick={() => void confirmDelete(chat)}
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {chats.length === 0 && (
          <p className="empty-hint">No chats yet. Start a new chat!</p>
        )}
      </nav>

      {authStatus !== "authenticated" && (
        <div className="sidebar-auth">
          <button className="small-btn" onClick={onLogin}>Log in</button>
          <button className="small-btn" onClick={onSignup}>Sign up</button>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
