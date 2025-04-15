/* eslint-disable */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, IconButton, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

interface ChatbotSidebarProps {
  documentId: string;
}

function TypingIndicator() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(prev => (prev.length < 3 ? prev + '.' : '')), 500);
    return () => clearInterval(id);
  }, []);
  return <Typography variant="body2" fontWeight="bold">{dots}</Typography>;
}

export default function ChatbotSidebar({ documentId }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      if (messages.length > 0) return;
      setIsTyping(true);
      try {
        const res = await fetch('/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
        });
        const data = await res.json();
        setMessages([{ sender: 'bot', text: data.message }]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    };
    fetchInitial();
  }, [documentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, documentId }),
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, an error occurred.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => isResizing && setSidebarWidth(Math.max(200, Math.min(600, window.innerWidth - e.clientX))),
    [isResizing],
  );
  const handleMouseUp = useCallback(() => setIsResizing(false), [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: sidebarWidth,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight="bold">
          ChatStudy
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              mb: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'bot' ? 'flex-start' : 'flex-end',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: m.sender === 'bot' ? 'grey.800' : 'primary.main',
                color: 'common.white',
                maxWidth: '80%',
                position: 'relative',
              }}
            >
              <Typography
                variant="caption"
                sx={{ position: 'absolute', top: -18, left: 4, color: 'grey.400' }}
              >
                {m.sender === 'bot' ? 'Chatbot' : 'Me'}
              </Typography>
              {m.sender === 'bot' ? <ReactMarkdown>{m.text}</ReactMarkdown> : <Typography variant="body2">{m.text}</Typography>}
            </Box>
          </Box>
        ))}
        {isTyping && (
          <Box
            sx={{
              mb: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'grey.800', color: 'common.white', maxWidth: '80%' }}>
              <Typography variant="caption" sx={{ position: 'absolute', top: -18, left: 4, color: 'grey.400' }}>
                Chatbot
              </Typography>
              <TypingIndicator />
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question…"
        />
        <IconButton onClick={handleSend}>
          <SendIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          width: 4,
          cursor: 'col-resize',
          backgroundColor: 'divider',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
}
