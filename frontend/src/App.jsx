
import './App.css'
import FlashcardApp from './components/FlashCards'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// import Admin from './components/Admin'
const api = "https://qubrain.vercel.app";
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
