import React from "react"
import D3Graph from "../components/d3-components/D3Graph"

export default function Page() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 40,
      }}
    >
      <h1>Welcome to AI Knowledge Graph Explorer</h1>
      <p>
        This is our homepage, and below is our D3 test graph component.
      </p>
      
      <D3Graph />
    </main>
  )
}
