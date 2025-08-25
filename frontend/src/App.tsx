import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { PortfolioDashboard } from './components/portfolio/PortfolioDashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<PortfolioDashboard />} />
        <Route path="/portfolio" element={<PortfolioDashboard />} />
      </Routes>
    </div>
  )
}

export default App