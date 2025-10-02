import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"
import { AIStatusProvider } from "@/contexts/AIStatusContext"
import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <AuthProvider>
        <AIStatusProvider>
          <Pages />
          <Toaster />
        </AIStatusProvider>
      </AuthProvider>
    </Router>
  )
}

export default App 
// Rock solid audit enforcement - Version panel
import RockSolidVersionPanel from './components/RockSolidVersionPanel';

// Add <RockSolidVersionPanel /> before closing </div> in the main return statement
