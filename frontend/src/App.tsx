import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Gallery from './pages/Gallery';
import Favorites from './pages/Favorites';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Register from './pages/Register';
import SharedImage from './pages/SharedImage';
import Shared from './pages/Shared';

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
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/s/:shareId" element={<SharedImage />} />

          <Route element={<Layout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Gallery />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/shared" element={<Shared />} />
            </Route>
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
