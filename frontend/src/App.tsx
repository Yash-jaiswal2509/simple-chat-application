import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import CreateRoom from "./components/CreateRoom"


function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreateRoom />} />

      </Routes>
    </Router>
  )
}

export default App
