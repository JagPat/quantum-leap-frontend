import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"
import { AIStatusProvider } from "@/contexts/AIStatusContext"

function App() {
  return (
    <AuthProvider>
      <AIStatusProvider>
        <Pages />
        <Toaster />
      </AIStatusProvider>
    </AuthProvider>
  )
}

export default App 