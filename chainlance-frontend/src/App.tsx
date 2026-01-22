import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Marketplace from './pages/Marketplace';
import PostJob from './pages/PostJob';
import JobDetails from './pages/JobDetails';
import MyProjects from './pages/MyProjects';
import ProjectWorkspace from './pages/ProjectWorkspace';
import AccountWallet from './pages/AccountWallet';
import AdminPanel from './pages/AdminPanel';
import FreelancerProfile from './pages/FreelancerProfile';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="main-nav">
          <div className="nav-brand">
            <h2>ChainLance</h2>
          </div>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              Marketplace
            </NavLink>
            <NavLink to="/post-job" className={({ isActive }) => isActive ? 'active' : ''}>
              Post Job
            </NavLink>
            <NavLink to="/my-projects" className={({ isActive }) => isActive ? 'active' : ''}>
              My Projects
            </NavLink>
            <NavLink to="/account" className={({ isActive }) => isActive ? 'active' : ''}>
              Account
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
              Admin
            </NavLink>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/job/:jobId" element={<JobDetails />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/workspace/:projectId" element={<ProjectWorkspace />} />
            <Route path="/account" element={<AccountWallet />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/profile/:walletAddress" element={<FreelancerProfile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
