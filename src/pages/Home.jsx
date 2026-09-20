import React, { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import ChatMobileBar from "../components/chat/ChatMobileBar.jsx";
import ChatSidebar from "../components/chat/ChatSidebar.jsx";
import ChatMessages from "../components/chat/ChatMessages.jsx";
import ChatComposer from "../components/chat/ChatComposer.jsx";
import "../components/chat/ChatLayout.css";
import { fakeAIReply } from "../components/chat/aiClient.js";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
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
} from "../store/chatSlice.js";
import { useRef } from "react";

const Home = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const chats = useSelector((state) => state.chat.chats);
  const activeChatId = useSelector((state) => state.chat.activeChatId);
  const input = useSelector((state) => state.chat.input);
  const isSending = useSelector((state) => state.chat.isSending);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [socket, setSocket] = useState(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const [messages, setMessages] = useState([
    // {
    //   type: "user",
    //   content: "Hello, how can I help you today?",
    // },
    // {
    //   type: "ai",
    //   content: "Hi there! I need assistance with my account.",
    // },
  ]);

  const handleNewChat = async () => {
    // Prompt user for title of new chat, fallback to 'New Chat'
    let title = window.prompt("Enter a title for the new chat:", "");
    if (title) title = title.trim();
    if (!title) return;

    const response = await axios.post(
      `${API_URL}/chat`,
      {
        title,
      },
      {
        withCredentials: true,
      },
    );
    console.log("new Chat -- >", response);
    getMessages(response.data.newChat._id);
    dispatch(startNewChat(response.data.newChat));
    setSidebarOpen(false);
  };

  const activeChatIdRef = useRef(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Ensure at least one chat exists initially
  useEffect(() => {
    console.log("run");
    axios
      .get(`${API_URL}/chat/`, {
        withCredentials: true,
      })
      .then((response) => {
        console.log("response ", response);
        dispatch(setChats(response.data.chats.reverse()));
      });

    const tempSocket = io(API_URL, {
      withCredentials: true,
    });

    tempSocket.on("send_Res", (messagePayload) => {
      // console.log(activeChatIdRef);
      // console.log("Received AI response:", messagePayload);
      if (activeChatIdRef.current !== messagePayload.chat_Id) {
        console.log("not match");
        return;
      }
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "ai",
          content: messagePayload.res,
        },
      ]);

      dispatch(sendingFinished());
    });

    tempSocket.on("chat_error", (error) => {
      console.error("Chat error:", error.message);
      dispatch(sendingFinished());
    });

    setSocket(tempSocket);
    return () => {
      tempSocket.disconnect();
    };
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    console.log("achaa ");
    console.log("Sending message:", trimmed);
    if (!trimmed || !activeChatId || isSending) return;
    dispatch(sendingStarted());

    const newMessages = [
      ...messages,
      {
        type: "user",
        content: trimmed,
      },
    ];

    console.log("New messages:", newMessages);

    setMessages(newMessages);
    dispatch(setInput(""));

    socket.emit("send_Msg", {
      chatId: activeChatId,
      query: trimmed,
    });

    // try {
    //   const reply = await fakeAIReply(trimmed);
    //   dispatch(addAIMessage(activeChatId, reply));
    // } catch {
    //   dispatch(addAIMessage(activeChatId, 'Error fetching AI response.', true));
    // } finally {
    //   dispatch(sendingFinished());
    // }
  };

  const getMessages = async (chatId) => {
    const response = await axios.get(`${API_URL}/chat/${chatId}`, {
      withCredentials: true,
    });

    console.log("Fetched messages:", response.data.messages);

    setMessages(
      response.data.messages.map((m) => ({
        id: m._id,
        type: m.role === "user" ? "user" : "ai",
        content: m.title,
      })),
    );
  };

  return (
    <div className="chat-layout minimal">
      <ChatMobileBar
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onNewChat={handleNewChat}
      />
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          dispatch(selectChat(id));
          setSidebarOpen(false);
          getMessages(id);
        }}
        onNewChat={handleNewChat}
        open={sidebarOpen}
      />
      <main className="chat-main" role="main">
        {messages.length === 0 && (
          <div className="chat-welcome" aria-hidden="true">
            <div className="chip">Early Preview</div>
            <h1>ChatGPT Clone</h1>
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
            setInput={(v) => dispatch(setInput(v))}
            onSend={sendMessage}
            isSending={isSending}
          />
        )}
      </main>
      {/* close button */}
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;
