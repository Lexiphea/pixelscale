import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';

const About = () => (
  <div className="space-y-4 max-w-2xl">
    <h1 className="text-3xl font-bold text-primary">PixelScale</h1>
    <p className="text-muted-foreground">
      A high-performance image hosting and resizing service built for Cloud Computing Final Project.
    </p>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Gallery />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
