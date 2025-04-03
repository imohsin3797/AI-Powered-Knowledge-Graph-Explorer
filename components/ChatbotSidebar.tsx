"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Box, TextField, IconButton, Typography, useTheme } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
}

interface ChatbotSidebarProps {
  docNamespace: string;
}

function TypingIndicator() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <Typography variant="body2" sx={{ fontWeight: "bold" }}>{dots}</Typography>;
}

export default function ChatbotSidebar({ docNamespace }: ChatbotSidebarProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialMessage = async () => {
      try {
        if (messages.length === 0) {
          setIsTyping(true);
          const res = await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ namespace: docNamespace }),
          });
          if (!res.ok) throw new Error(`Failed to load initial message (status ${res.status})`);
          const data = await res.json();
          setMessages([{ sender: "bot", text: data.message }]);
          setIsTyping(false);
        }
      } catch (err) {
        console.error("Error fetching initial chatbot message:", err);
        setIsTyping(false);
      }
    };
    fetchInitialMessage();
  }, [docNamespace]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, namespace: docNamespace }),
      });
      if (!res.ok) throw new Error(`Failed to get chatbot reply (status ${res.status})`);
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.message }]);
    } catch (err) {
      console.error("Error fetching chatbot reply:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "Sorry, I encountered an error." }]);
    } finally {
      setIsTyping(false);
    }
  };


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) setIsResizing(false);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: sidebarWidth,
        backgroundColor: "background.paper",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
      }}
    >

      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          ChatStudy
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              mb: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "bot" ? "flex-start" : "flex-end",
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: msg.sender === "bot" ? "grey.800" : "primary.main",
                color: "common.white",
                maxWidth: "80%",
                position: "relative",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  top: -18,
                  left: 4,
                  color: msg.sender === "bot" ? "grey.400" : "grey.300",
                }}
              >
                {msg.sender === "bot" ? "Chatbot" : "Me"}
              </Typography>
              {msg.sender === "bot" ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                <Typography variant="body2">{msg.text}</Typography>
              )}
            </Box>
          </Box>
        ))}
        {isTyping && (
          <Box
            sx={{
              mb: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: "grey.800",
                color: "common.white",
                maxWidth: "80%",
                position: "relative",
              }}
            >
              <Typography
                variant="caption"
                sx={{ position: "absolute", top: -18, left: 4, color: "grey.400" }}
              >
                Chatbot
              </Typography>
              <TypingIndicator />
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question..."
        />
        <IconButton onClick={handleSend}>
          <SendIcon />
        </IconButton>
      </Box>
      
      <Box
        sx={{
          width: 4,
          cursor: "col-resize",
          backgroundColor: "divider",
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
}
