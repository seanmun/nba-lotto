// src/components/common/Header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <h1 className="text-white text-2xl font-bold">Trust The Pick</h1>
            <span className="text-blue-200 ml-2 text-sm">Fantasy Draft Lottery</span>
          </Link>
          <nav className="flex space-x-4">
            <Link to="/" className="text-white hover:text-blue-200 transition">
              Home
            </Link>
            <Link to="/about" className="text-white hover:text-blue-200 transition">
              How It Works
            </Link>
            {currentUser ? (
              <>
                <button 
                  onClick={handleDashboard}
                  className="text-white hover:text-blue-200 transition"
                >
                  Dashboard
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-white hover:text-blue-200 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-white text-blue-700 px-4 py-1 rounded-md hover:bg-blue-100 transition"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;