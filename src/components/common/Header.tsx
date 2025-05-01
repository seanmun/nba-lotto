// src/components/common/Header.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <h1 className="text-white text-xl font-bold">Trust The Pick</h1>
            <span className="text-blue-200 ml-2 text-xs">Fantasy Draft Lottery</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
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
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-2 transition-all duration-300">
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/" 
                className="text-white hover:text-blue-200 transition py-2"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className="text-white hover:text-blue-200 transition py-2"
                onClick={() => setMenuOpen(false)}
              >
                How It Works
              </Link>
              {currentUser ? (
                <>
                  <button 
                    onClick={handleDashboard}
                    className="text-white hover:text-blue-200 transition py-2 text-left"
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="text-white hover:text-blue-200 transition py-2 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-white text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100 transition text-center"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;