'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Button, Stepper, Step, StepLabel, Card, CardMedia, CardContent, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactMarkdown from 'react-markdown';

interface VideoLink { url: string; title: string; thumbnail: string }
interface WebLink   { url: string; title: string; thumbnail: string | null; description: string | null }
interface StepData  { title: string; summary: string; youtubeLinks: VideoLink[]; webLinks: WebLink[] }

interface Props {
  open: boolean;
  onClose: () => void;
  concept: string;
  documentId: string;
}

export default function StudyPath({ open, onClose, concept, documentId }: Props) {
  const [steps, setSteps] = useState<StepData[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActive(null); setSteps([]);
    const fetchPath = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/study-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept, documentId }),
        });
        const data = await res.json();
        setSteps(data.steps || []);
      } catch { } finally { setLoading(false); }
    };
    fetchPath();
  }, [open, concept, documentId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {active === null ? `Study Path: ${concept}` : (
          <>
            <IconButton size="small" onClick={() => setActive(null)}><ArrowBackIcon /></IconButton>
            {steps[active].title}
          </>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 400 }}>
        {loading ? <Typography>Generating study path…</Typography> : (
          <>
            {active === null ? (
              <Stepper orientation="vertical" nonLinear>
                {steps.map((s, i) => (
                  <Step key={i} completed={false} active={false}>
                    <StepLabel onClick={() => setActive(i)} sx={{ cursor: 'pointer' }}>{s.title}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>Overview</Typography>
                <ReactMarkdown>{steps[active].summary}</ReactMarkdown>

                <Typography variant="subtitle1" sx={{ mt: 2 }}>🎥 Videos</Typography>
                {steps[active].youtubeLinks.map((v, i) => (
                  <Card key={i} sx={{ display: 'flex', mb: 1, cursor: 'pointer' }} onClick={() => window.open(v.url, '_blank')}>
                    <CardMedia component="img" sx={{ width: 100 }} image={v.thumbnail} alt={v.title} />
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{v.title}</Typography>
                    </CardContent>
                  </Card>
                ))}

                <Typography variant="subtitle1" sx={{ mt: 2 }}>🌐 Web Resources</Typography>
                {steps[active].webLinks.map((w, i) => (
                  <Card key={i} sx={{ display: 'flex', mb: 1, cursor: 'pointer' }} onClick={() => window.open(w.url, '_blank')}>
                    {w.thumbnail && <CardMedia component="img" sx={{ width: 100 }} image={w.thumbnail} alt={w.title} />}
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{w.title}</Typography>
                      {w.description && <Typography variant="caption">{w.description}</Typography>}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      {active === null && !loading && (
        <Box sx={{ p: 2, textAlign: 'right' }}>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </Box>
      )}
    </Dialog>
  );
}
