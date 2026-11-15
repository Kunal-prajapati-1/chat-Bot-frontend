import { createSlice, nanoid } from "@reduxjs/toolkit";

const createEmptyChat = (title = "New Chat") => ({
  id: nanoid(),
  title,
  type: "guest",
  messages: [],
});

const initialState = {
  chats: [],
  activeChatId: null,
  sendingChatId: null,
  input: "",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,

  reducers: {
    addChat(state, action) {
      const chat = action.payload;

      const id = String(chat.id ?? chat._id);

      // Avoid adding the same chat twice.
      if (
        state.chats.some(
          (existing) => String(existing.id ?? existing._id) === id,
        )
      ) {
        state.activeChatId = id;
        return;
      }

      state.chats.unshift({
        ...chat,
        id,
        type: chat.type ?? "registered",
        messages: chat.messages ?? [],
      });

      state.activeChatId = id;
    },

    ensureInitialChat(state) {
      if (state.chats.length === 0) {
        const chat = createEmptyChat();
        state.chats.unshift(chat);
        state.activeChatId = chat.id;
      }
    },
    setChatMessages(state, action) {
      const { chatId, messages } = action.payload;

      const chat = state.chats.find(
        (item) => String(item.id ?? item._id) === String(chatId),
      );

      if (chat) {
        chat.messages = messages;
      }
    },
    startNewChat: {
      reducer(state, action) {
        const chat = action.payload;
        const id = chat.id ?? chat._id;

        state.chats.unshift({
          ...chat,
          id,
          type: chat.type || "guest",
          messages: chat.messages || [],
        });

        state.activeChatId = id;
      },
      prepare(title = "New Chat") {
        return {
          payload: createEmptyChat(title),
        };
      },
    },

    selectChat(state, action) {
      state.activeChatId = action.payload;
    },

    setInput(state, action) {
      state.input = action.payload;
    },

    sendingStarted(state, action) {
      state.sendingChatId = action.payload;
    },

    sendingFinished(state, action) {
      if (state.sendingChatId === action.payload) {
        state.sendingChatId = null;
      }
    },

    setChats(state, action) {
      state.chats = action.payload.map((chat) => ({
        ...chat,
        id: chat.id ?? chat._id,
        type: chat.type || "registered",
        messages: chat.messages || [],
      }));

      if (
        state.activeChatId &&
        !state.chats.some((chat) => chat.id === state.activeChatId)
      ) {
        state.activeChatId = null;
      }
    },

    addUserMessage: {
      reducer(state, action) {
        const { chatId, message } = action.payload;
        const chat = state.chats.find((c) => c.id === chatId);

        if (!chat) return;

        if (chat.messages.length === 0) {
          chat.title =
            message.content.slice(0, 40) +
            (message.content.length > 40 ? "…" : "");
        }

        chat.messages.push(message);
      },

      prepare(chatId, content) {
        return {
          payload: {
            chatId,
            message: {
              id: nanoid(),
              role: "user",
              type: "user",
              content,
              ts: Date.now(),
            },
          },
        };
      },
    },

    addAIMessage: {
      reducer(state, action) {
        const { chatId, message } = action.payload;
        const chat = state.chats.find((c) => c.id === chatId);

        if (!chat) return;

        chat.messages.push(message);
      },

      prepare(chatId, content, error = false) {
        return {
          payload: {
            chatId,
            message: {
              id: nanoid(),
              role: "ai",
              type: "ai",
              content,
              ts: Date.now(),
              ...(error ? { error: true } : {}),
            },
          },
        };
      },
    },

    renameChatLocal(state, action) {
      const { chatId, title } = action.payload;
      const chat = state.chats.find(
        (item) => String(item.id ?? item._id) === String(chatId),
      );
      if (chat) chat.title = title;
    },

    deleteChatLocal(state, action) {
      const chatId = String(action.payload);
      state.chats = state.chats.filter(
        (item) => String(item.id ?? item._id) !== chatId,
      );

      if (String(state.activeChatId) === chatId) {
        state.activeChatId = state.chats[0]?.id ?? null;
      }

      if (String(state.sendingChatId) === chatId) {
        state.sendingChatId = null;
      }
    },

    reorderChatsLocal(state, action) {
      const orderedIds = action.payload.map(String);
      const chatMap = new Map(
        state.chats.map((chat) => [String(chat.id ?? chat._id), chat]),
      );

      const orderedChats = orderedIds
        .map((id) => chatMap.get(id))
        .filter(Boolean);

      // Preserve any chats not included in the requested order.
      const included = new Set(orderedIds);
      const remaining = state.chats.filter(
        (chat) => !included.has(String(chat.id ?? chat._id)),
      );

      state.chats = [...orderedChats, ...remaining];
    },
  },
});

export const {
  ensureInitialChat,
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  addUserMessage,
  addAIMessage,
  setChats,
  setChatMessages,
  addChat,
  renameChatLocal,
  deleteChatLocal,
  reorderChatsLocal,
} = chatSlice.actions;

export default chatSlice.reducer;
