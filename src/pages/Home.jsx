import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  renameChatLocal,
  deleteChatLocal,
  reorderChatsLocal,
} from "../store/chatSlice.js";

import ChatMobileBar from "../components/chat/ChatMobileBar.jsx";
import ChatSidebar from "../components/chat/ChatSidebar.jsx";
import ChatMessages from "../components/chat/ChatMessages.jsx";
import ChatComposer from "../components/chat/ChatComposer.jsx";
import "../components/chat/ChatLayout.css";

import { createGuestSession } from "../services/guestSession.js";
import AuthModal from "../components/auth/AuthModal.jsx";
import {
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
} from "../store/chatSlice.js";

import {
  setGuest,
  setAuthenticated,
  setUnauthenticated,
} from "../store/authSlice.js";

import { loadGuestChats, saveGuestChats } from "../store/chatPersistence.js";

const Home = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();

  // Redux state
  const chats = useSelector((state) => state.chat.chats);
  const activeChatId = useSelector((state) => state.chat.activeChatId);
  const input = useSelector((state) => state.chat.input);
  const sendingChatId = useSelector((state) => state.chat.sendingChatId);
  const authStatus = useSelector((state) => state.auth.status);
  useEffect(() => {
    if (authStatus !== "guest") return;

    const savedChats = loadGuestChats();

    if (savedChats.length > 0) {
      dispatch(setChats(savedChats));
    } else {
      dispatch(ensureInitialChat());
    }
  }, [authStatus, dispatch]);
  // Local UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  // null = closed, "login" = login modal, "signup" = signup modal

  // Keep one socket connection
  const socketRef = useRef(null);

  // Keep the latest selected chat ID available to callbacks if needed
  const activeChatIdRef = useRef(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Current chat and messages come from Redux
  const activeChat =
    chats.find(
      (chat) => String(chat.id ?? chat._id) === String(activeChatId),
    ) ?? null;

  const messages = activeChat?.messages ?? [];
  const isSending =
    sendingChatId !== null && String(sendingChatId) === String(activeChatId);

  // Create an initial chat if the list is empty
  useEffect(() => {
    dispatch(ensureInitialChat());
  }, [dispatch]);

  useEffect(() => {
    if (authStatus !== "guest") return;

    saveGuestChats(chats);
  }, [authStatus, chats]);

  // Check the session, establish the right flow, then connect one socket
  useEffect(() => {
    let cancelled = false;
    let tempSocket = null;

    async function initializeSession() {
      try {
        setSessionReady(false);

        // 1. Check the existing session.
        const sessionResponse = await axios.get(`${API_URL}/auth/me`, {
          withCredentials: true,
        });

        if (cancelled) return;

        const { type, user } = sessionResponse.data;

        // 2. Choose the correct session flow.
        if (type === "authenticated") {
          dispatch(setAuthenticated(user));

          // Registered users load chats from the backend.
          const chatsResponse = await axios.get(`${API_URL}/chat/`, {
            withCredentials: true,
          });

          if (cancelled) return;

          const serverChats = (chatsResponse.data.chats ?? [])
            .map((chat) => ({
              ...chat,
              id: String(chat.id ?? chat._id),
              type: "registered",
              messages: [],
            }))
            .reverse();

          dispatch(setChats(serverChats));
          // Select a real MongoDB chat after login.
          if (serverChats.length > 0) {
            dispatch(selectChat(serverChats[0].id));
          }
        } else if (type === "guest") {
          dispatch(setGuest());
        } else {
          // Create a guest session only when no valid session exists.
          await createGuestSession();

          if (cancelled) return;

          dispatch(setGuest());
        }

        if (cancelled) return;

        // 3. Connect only after the session is established.
        tempSocket = io(API_URL, {
          withCredentials: true,
        });

        socketRef.current = tempSocket;

        tempSocket.on("connect", () => {
          if (!cancelled) {
            setSessionReady(true);
            console.log("Socket connected");
          }
        });

        tempSocket.on("send_Res", (payload) => {
          dispatch(sendingFinished(payload.chat_Id));
          dispatch(addAIMessage(payload.chat_Id, payload.res));
        });

        tempSocket.on("chat_error", (error) => {
          console.error("Chat error:", error.message);

          if (error.chat_Id) {
            dispatch(sendingFinished(error.chat_Id));
          }
        });

        tempSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error.message);

          if (!cancelled) {
            setSessionReady(false);
          }
        });
      } catch (error) {
        console.error("Session initialization failed:", error);

        if (!cancelled) {
          dispatch(setUnauthenticated());
          setSessionReady(false);
        }
      }
    }

    initializeSession();

    return () => {
      cancelled = true;
      tempSocket?.disconnect();

      if (socketRef.current === tempSocket) {
        socketRef.current = null;
      }

      setSessionReady(false);
    };
  }, [API_URL, dispatch]);

  // Start a new local chat
  const handleNewChat = async () => {
    setSidebarOpen(false);

    // Guest users get a local chat.
    if (authStatus !== "authenticated") {
      dispatch(startNewChat("New Chat"));
      return;
    }

    // Registered users must create a chat in MongoDB.
    try {
      const response = await axios.post(
        `${API_URL}/chat/`,
        { title: "New Chat" },
        { withCredentials: true },
      );

      const newChat = response.data.newChat;

      dispatch(
        addChat({
          ...newChat,
          id: String(newChat._id ?? newChat.id),
          type: "registered",
          messages: [],
        }),
      );
    } catch (error) {
      console.error(
        "Failed to create registered chat:",
        error.response?.data ?? error.message,
      );
    }
  };

  const handleSelectChat = async (chatId) => {
    dispatch(selectChat(chatId));
    setSidebarOpen(false);

    const selectedChat = chats.find(
      (chat) => String(chat.id ?? chat._id) === String(chatId),
    );

    if (!selectedChat || selectedChat.type !== "registered") {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/chat/${chatId}`, {
        withCredentials: true,
      });

      const messages = (response.data.messages ?? []).map((message) => ({
        ...message,
        id: String(message._id ?? message.id),
        type: message.role === "user" ? "user" : "ai",
        content: message.title ?? message.content ?? "",
      }));

      dispatch(setChatMessages({ chatId, messages }));
    } catch (error) {
      console.error(
        "Failed to load messages:",
        error.response?.data ?? error.message,
      );
    }
  };

  // Send a message through the active socket
  const sendMessage = () => {
    const trimmed = input.trim();

    if (
      !trimmed ||
      !activeChat ||
      isSending ||
      !sessionReady ||
      !socketRef.current?.connected
    ) {
      return;
    }

    // ADD THIS CHECK
    if (authStatus === "authenticated" && activeChat.type !== "registered") {
      console.warn("Cannot send a guest chat as a registered-user chat.");
      return;
    }

    dispatch(addUserMessage(activeChatId, trimmed));
    dispatch(sendingStarted(activeChatId));
    dispatch(setInput(""));

    socketRef.current.emit("send_Msg", {
      chatId: activeChatId,
      query: trimmed,
    });
  };

  const handleRenameChat = async (chatId, title, chat) => {
    const previousTitle = chat.title;

    // Update immediately for a responsive UI.
    dispatch(renameChatLocal({ chatId, title }));

    if (chat.type !== "registered") return;

    try {
      await axios.patch(
        `${API_URL}/chat/${chatId}`,
        { title },
        { withCredentials: true },
      );
    } catch (error) {
      dispatch(renameChatLocal({ chatId, title: previousTitle }));
      console.error("Rename failed:", error.response?.data ?? error.message);
      window.alert("Could not rename this chat. Please try again.");
    }
  };

  const handleDeleteChat = async (chatId, chat) => {
    if (chat.type === "registered") {
      try {
        await axios.delete(`${API_URL}/chat/${chatId}`, {
          withCredentials: true,
        });
      } catch (error) {
        console.error("Delete failed:", error.response?.data ?? error.message);
        window.alert("Could not delete this chat. Please try again.");
        return;
      }
    }

    dispatch(deleteChatLocal(chatId));

    // If the deleted chat was active, fetch messages for the replacement.
    const remaining = chats.filter(
      (item) => String(item.id ?? item._id) !== String(chatId),
    );

    const nextChat = remaining[0];
    if (nextChat?.type === "registered") {
      void handleSelectChat(String(nextChat.id ?? nextChat._id));
    }
  };

  const handleReorderChats = async (chatIds) => {
    const previousOrder = chats.map((chat) => String(chat.id ?? chat._id));

    dispatch(reorderChatsLocal(chatIds));

    if (authStatus !== "authenticated") return;

    try {
      await axios.patch(
        `${API_URL}/chat/reorder`,
        { chatIds },
        { withCredentials: true },
      );
    } catch (error) {
      dispatch(reorderChatsLocal(previousOrder));
      console.error("Reorder failed:", error.response?.data ?? error.message);
      window.alert("Could not save chat order. Please try again.");
    }
  };

  return (
    <div className="chat-layout minimal">
      <ChatMobileBar
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onNewChat={handleNewChat}
        onLogin={() => setAuthMode("login")}
        onSignup={() => setAuthMode("signup")}
      />

      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onLogin={() => setAuthMode("login")}
        onSignup={() => setAuthMode("signup")}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onReorderChats={handleReorderChats}
        authStatus={authStatus}
        open={sidebarOpen}
      />

      <main className="chat-main" role="main">
        {messages.length === 0 && (
          <div className="chat-welcome" aria-hidden="true">
            <div className="chip">Early Preview</div>
            <h1>ChatGPT</h1>
            <p>
              Ask anything. Paste text, brainstorm ideas, or get quick
              explanations. Your chats stay in the sidebar so you can pick up
              where you left off.
            </p>
          </div>
        )}

        <ChatMessages messages={messages} isSending={isSending} />

        {activeChatId && (
          <ChatComposer
            input={input}
            setInput={(value) => dispatch(setInput(value))}
            onSend={sendMessage}
            isSending={isSending || !sessionReady}
          />
        )}
      </main>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AuthModal
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitch={(mode) => setAuthMode(mode)}
        onSuccess={() => {
          setAuthMode(null);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Home;
