import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Responder from './coleta/Responder'

export default function App() {
  return <BrowserRouter><Routes><Route path="/responder/:slug" element={<Responder />} /></Routes></BrowserRouter>
}
