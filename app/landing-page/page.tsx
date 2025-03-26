"use client"

import * as React from "react"
import Link from "next/link"
import {
  Box,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
} from "@mui/material"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"

export default function LandingPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Box
        component="section"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          py: { xs: 8, md: 12 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h1"
            fontWeight="bold"
            sx={{ mb: 2 }}
          >
            AI-Powered Graph-Based Knowledge Explorer
          </Typography>
          <Typography
            variant="body1"
            sx={{ maxWidth: 600, mx: "auto", mb: 4, color: "text.secondary" }}
          >
            An intelligent system that visualizes complex topic relationships in
            an interactive, dynamic knowledge graph.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              component={Link}
              href="#try-demo"
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              component={Link}
              href="#features"
              sx={{ px: 4, py: 1.5 }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      <Box
        component="section"
        id="features"
        sx={{
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
            Why Use Our Explorer?
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 6 }}>
            Quickly discover interconnected ideas, concepts, and insights with
            minimal effort.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card
                variant="outlined"
                sx={{
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    AI-Driven Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The system intelligently collects and links related
                    concepts, saving you hours of manual research.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                variant="outlined"
                sx={{
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    Interactive Visualization
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explore ideas in a dynamic, user-friendly graph, making
                    complex relationships easier to digest.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                variant="outlined"
                sx={{
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    Instant Topic Generation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Simply enter a topic and watch the knowledge graph evolve in
                    real-time based on AI insights.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        component="section"
        sx={{
          bgcolor: "grey.100",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
            Challenges We Solve
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "text.secondary", maxWidth: 800, mb: 4 }}
          >
            Structuring and visualizing relationships in a meaningful way can be
            difficult. Our AI-powered knowledge explorer simplifies this process
            by automatically creating clear connections and interactive graphs.
          </Typography>
        </Container>
      </Box>

      <Box
        component="section"
        id="try-demo"
        sx={{
          textAlign: "center",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight="bold">
            See It In Action
          </Typography>
          <Typography
            variant="body1"
            sx={{ mt: 2, mb: 4, color: "text.secondary" }}
          >
            Ready to transform research into a seamless and insightful process?
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            Try the Demo
          </Button>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          borderTop: 1,
          borderColor: "divider",
          py: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} AI-Powered Graph-Based Knowledge
          Explorer. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}
