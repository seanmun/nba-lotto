// src/components/Home.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
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

  const handleAbout = () => {
    navigate('/about');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-white text-2xl font-bold">Trust The Pick</h1>
              <span className="text-blue-200 ml-2 text-sm">Fantasy Draft Lottery</span>
            </div>
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

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-800 to-blue-700 text-white py-16">
          <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h2 className="text-4xl font-bold mb-4">Run Your Fantasy Draft Lottery with Transparency and Trust</h2>
              <p className="text-xl mb-6">
                Bring the excitement of the NBA Draft Lottery to your fantasy league with a secure, fair, and transparent process.
              </p>
              <div className="flex flex-wrap gap-4">
                {currentUser ? (
                  <button 
                    onClick={handleDashboard}
                    className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-blue-100 transition"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-blue-100 transition"
                  >
                    Get Started
                  </button>
                )}
                <button 
                  onClick={handleAbout}
                  className="bg-transparent text-white border-2 border-white px-6 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-700 transition"
                >
                  How It Works
                </button>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              {/* Hero Image Placeholder */}
              <img 
                src="/hero.png" 
                alt="NBA Lottery Simulation" 
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
                <h3 className="text-xl font-bold mb-2">Create Your Lottery</h3>
                <p className="text-gray-600">
                  Set up your league lottery with team names, emails, and odds distribution following the official NBA lottery system.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
                <h3 className="text-xl font-bold mb-2">Multi-Witness Verification</h3>
                <p className="text-gray-600">
                  Ensure fairness with our unique multi-key verification system requiring multiple league members to witness the draft lottery.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
                <h3 className="text-xl font-bold mb-2">Dramatic Reveal</h3>
                <p className="text-gray-600">
                  Experience the excitement of a real draft lottery with animated ball drawings and a suspenseful pick-by-pick reveal.
                </p>
              </div>
            </div>
            <div className="text-center mt-10">
              <button 
                onClick={handleAbout}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Learn More About the NBA Lottery System
              </button>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Why Trust Our System?</h2>
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">NBA-Style Odds</h3>
                <p className="text-gray-700">
                  Uses the exact same odds and lottery ball system as the official NBA Draft Lottery, with 1,000 unique combinations assigned to teams based on their rankings.
                </p>
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Multi-Verification System</h3>
                <p className="text-gray-700">
                  Our unique verification system requires multiple league members to be present, ensuring no single person can manipulate the results.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Full Transparency</h3>
                <p className="text-gray-700">
                  Download a CSV of all lottery combinations before the drawing begins. Verify the results are fair and see exactly which combinations determined each pick.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Trust The Pick</h3>
              <p className="text-gray-400">The trusted solution for fantasy draft lotteries</p>
            </div>
            <div className="flex space-x-6">
              <Link to="/about" className="text-gray-300 hover:text-white transition">
                How It Works
              </Link>
              <a href="#" className="text-gray-300 hover:text-white transition">
                Terms of Service
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition">
                Privacy Policy
              </a>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Trust The Pick. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;