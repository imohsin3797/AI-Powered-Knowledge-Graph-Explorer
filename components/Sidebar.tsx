'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  Button,                   // ← added
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactMarkdown from 'react-markdown';
import StudyPath from './StudyPath';   // ← added

interface NodeData {
  id: string;
  size: 'large' | 'medium' | 'small';
  ring: number;
}

interface VideoLink {
  url: string;
  title: string;
  thumbnail: string;
}

interface WebLink {
  url: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
}

interface SidebarProps {
  selectedNode: NodeData | null;
  onClose: () => void;
  documentId: string;
}

export default function Sidebar({ selectedNode, onClose, documentId }: SidebarProps) {
  const [summary, setSummary] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState<VideoLink[]>([]);
  const [webLinks, setWebLinks] = useState<WebLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);       // ← added

  useEffect(() => {
    if (!selectedNode) {
      setSummary('');
      setYoutubeLinks([]);
      setWebLinks([]);
      return;
    }
    const fetchNodeData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/node-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: selectedNode.id, documentId }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        setSummary(data.summary || '');
        setYoutubeLinks(data.youtubeLinks || []);
        setWebLinks(data.webLinks || []);
      } catch (err) {
        console.error('Error fetching node info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNodeData();
  }, [selectedNode, documentId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing) setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
    },
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
    <>
      <Drawer
        anchor="left"
        variant="persistent"
        open={Boolean(selectedNode)}
        hideBackdrop
        ModalProps={{ hideBackdrop: true }}
        PaperProps={{
          sx: {
            width: sidebarWidth,
            top: '-10px',
            position: 'absolute',
            backgroundColor: 'background.paper',
            color: 'text.primary',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Concept Summary</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
          {selectedNode && (
            <>
              <Typography variant="h6" gutterBottom textAlign="center">
                {selectedNode.id}
              </Typography>

              {/* ---- centered Study‑Path button ---- */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button variant="outlined" onClick={() => setOpenStudy(true)}>
                  Generate Study‑Path
                </Button>
              </Box>

              {loading ? (
                <Typography>Loading details…</Typography>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">Detailed Summary</Typography>
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">🎥 Related YouTube Videos</Typography>
                    {youtubeLinks.length === 0 ? (
                      <Typography variant="body2">No videos found.</Typography>
                    ) : (
                      youtubeLinks.map((v, i) => (
                        <Card key={i} sx={{ display: 'flex', mb: 1, cursor: 'pointer' }} onClick={() => window.open(v.url, '_blank')}>
                          <CardMedia component="img" sx={{ width: 100 }} image={v.thumbnail} alt={v.title} />
                          <CardContent sx={{ p: 1, overflow: 'hidden' }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                              {v.title}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">🌐 Helpful Web Resources</Typography>
                    {webLinks.length === 0 ? (
                      <Typography variant="body2">No resources found.</Typography>
                    ) : (
                      webLinks.map((a, i) => (
                        <Card key={i} sx={{ display: 'flex', mb: 1, cursor: 'pointer' }} onClick={() => window.open(a.url, '_blank')}>
                          {a.thumbnail && <CardMedia component="img" sx={{ width: 100 }} image={a.thumbnail} alt={a.title} />}
                          <CardContent sx={{ p: 1, overflow: 'hidden' }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5, lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                              {a.title}
                            </Typography>
                            {a.description && (
                              <Typography variant="caption" sx={{ lineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>
                                {a.description}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>
                </>
              )}
            </>
          )}
        </Box>

        <Box
          sx={{
            width: 4,
            cursor: 'col-resize',
            backgroundColor: 'divider',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
        />
      </Drawer>

      {selectedNode && (
        <StudyPath
          open={openStudy}
          onClose={() => setOpenStudy(false)}
          concept={selectedNode.id}
          documentId={documentId}
        />
      )}
    </>
  );
}
