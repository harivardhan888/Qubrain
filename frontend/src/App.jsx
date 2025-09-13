
import './App.css'
import FlashcardApp from './components/FlashCards'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// import Admin from './components/Admin'
const api = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://qubrain-backend.vercel.app" : "http://localhost:5000");
function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<FlashcardApp api={api}/>} />
        {/* <Route path="/admin" element={<Admin />} /> */}
      </Routes>
    </Router>
  )
}

export default App
