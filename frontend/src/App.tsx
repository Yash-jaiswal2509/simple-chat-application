import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import CreateRoom from "./components/CreateRoom"
import ChatRoom from "./components/ChatRoom"


function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/chat/:roomCode" element={<ChatRoom />} />
      </Routes>
    </Router>
  )
}

export default App
