import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/Auth';
import Channel from './pages/Channel';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ProfileSettings from './pages/ProfileSettings';
import Search from './pages/Search';
import Upload from './pages/Upload';
import Watch from './pages/Watch';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="watch/:id" element={<Watch />} />
        <Route path="channel/:id" element={<Channel />} />
        <Route path="search" element={<Search />} />
        <Route path="auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="upload" element={<Upload />} />
          <Route path="settings/profile" element={<ProfileSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
