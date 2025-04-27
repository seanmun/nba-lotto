// src/components/About.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const About: React.FC = () => {
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
        <section className="bg-gradient-to-b from-blue-800 to-blue-700 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4 text-center">How the NBA Lottery System Works</h1>
            <p className="text-xl max-w-3xl mx-auto text-center">
              Learn how our fantasy draft lottery simulator accurately replicates the official NBA lottery process
            </p>
          </div>
        </section>

        {/* Lottery Explanation */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8">The NBA Draft Lottery Process</h2>
            
            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">The Lottery Balls</h3>
              <p className="text-lg mb-4">
                The NBA Draft Lottery uses 14 numbered ping-pong balls, which create 1,001 possible four-number combinations when drawn. Each team is assigned a certain number of combinations based on their record from the previous season.
              </p>
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="text-xl font-bold mb-2">The Math Behind It</h4>
                <p className="mb-4">
                  Combinations = (14 choose 4) = 14! / (4! × 10!) = 1,001
                </p>
                <p>
                  Since 1,001 doesn't divide evenly among the teams, one combination (typically 11-12-13-14) is excluded, leaving exactly 1,000 combinations to distribute.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Official NBA Odds Distribution</h3>
              <p className="text-lg mb-6">
                As of 2023, the NBA uses the following odds distribution for the 14 non-playoff teams:
              </p>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 border-b border-gray-200 font-bold text-left">Team Position</th>
                      <th className="py-3 px-4 border-b border-gray-200 font-bold text-left">Odds for #1 Pick</th>
                      <th className="py-3 px-4 border-b border-gray-200 font-bold text-left">Number of Combinations</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">1st worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">14.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">140</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">2nd worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">14.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">140</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">3rd worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">14.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">140</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">4th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">12.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">125</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">5th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">10.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">105</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">6th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">9.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">90</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">7th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">7.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">75</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">8th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">6.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">60</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">9th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">4.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">45</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">10th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">3.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">30</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">11th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">2.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">20</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">12th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">1.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">15</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-2 px-4 border-b border-gray-200">13th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">1.0%</td>
                      <td className="py-2 px-4 border-b border-gray-200">10</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b border-gray-200">14th worst</td>
                      <td className="py-2 px-4 border-b border-gray-200">0.5%</td>
                      <td className="py-2 px-4 border-b border-gray-200">5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Leagues With Fewer Than 14 Teams</h3>
              <p className="text-lg mb-4">
                When your fantasy league has fewer than 14 teams, our system automatically adjusts by using the appropriate subset of the NBA odds distribution:
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">For 12 Teams</h4>
                  <p>
                    Uses the first 12 percentages (14.0% to 1.5%), totaling 985 combinations.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">For 8 Teams</h4>
                  <p>
                    Uses the first 8 percentages (14.0% to 6.0%), totaling 875 combinations.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">For 4 Teams</h4>
                  <p>
                    Uses the first 4 percentages (14.0% to 12.5%), totaling 545 combinations.
                  </p>
                </div>
              </div>
              
              <p className="text-lg">
                The remaining unassigned combinations are simply not used in the drawing process. If an unassigned combination is drawn, the system will redraw until an assigned combination appears.
              </p>
            </div>

            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">The Drawing Process</h3>
              <p className="text-lg mb-4">
                The NBA lottery determines only the first four picks of the draft. The remaining picks are assigned in inverse order of the teams' records.
              </p>
              
              <ol className="list-decimal pl-6 space-y-3 mb-6">
                <li className="text-lg">Four balls are randomly drawn from the set of 14 balls, creating a four-number combination.</li>
                <li className="text-lg">The team assigned to that combination receives the 1st pick.</li>
                <li className="text-lg">The balls are returned, and the process is repeated for the 2nd pick.</li>
                <li className="text-lg">If a combination belonging to a team that has already received a pick is drawn, the drawing is redone.</li>
                <li className="text-lg">This process continues until all four lottery picks are determined.</li>
                <li className="text-lg">The remaining teams receive picks 5-14 based on their inverse record order.</li>
              </ol>
            </div>
            
            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Our Multi-Verification System</h3>
              <p className="text-lg mb-4">
                Trust The Pick implements a unique multi-verification system to ensure fairness and transparency:
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h4 className="text-xl font-bold mb-3">How It Works</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li className="text-lg">The league admin creates a lottery and specifies how many verifiers are required</li>
                  <li className="text-lg">The admin counts as the first verifier</li>
                  <li className="text-lg">Other league members must log in and verify the lottery</li>
                  <li className="text-lg">Only when the required number of verifiers are present can the lottery proceed</li>
                  <li className="text-lg">This works like a safety deposit box that requires multiple keys to open</li>
                </ul>
              </div>
              
              <p className="text-lg">
                This system ensures that no single person, not even the league commissioner, can manipulate the lottery results. The lottery process only begins when multiple witnesses are present to observe it.
              </p>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-4">Complete Transparency</h3>
              <p className="text-lg mb-6">
                Our system provides full transparency at every step:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">Downloadable Combination CSV</h4>
                  <p>
                    Before the lottery begins, all participants can download a CSV file showing exactly which combinations are assigned to each team.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">Animated Drawing Process</h4>
                  <p>
                    Watch the lottery balls being drawn in real-time with all verifiers witnessing the same process simultaneously.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">Combination Tracking</h4>
                  <p>
                    Each drawn combination is displayed along with the corresponding team, so everyone can verify the results.
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">Dramatic Reveal</h4>
                  <p>
                    The draft order is revealed one by one, from the last pick to the first, building suspense just like the official NBA lottery reveal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-blue-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Run Your League's Draft Lottery?</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Join thousands of fantasy leagues who trust our system for fair, transparent, and exciting draft lotteries.
            </p>
            <div className="flex justify-center space-x-4">
              {currentUser ? (
                <button 
                  onClick={handleDashboard}
                  className="bg-white text-blue-700 px-8 py-3 rounded-lg font-bold hover:bg-blue-100 transition"
                >
                  Go to Dashboard
                </button>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-white text-blue-700 px-8 py-3 rounded-lg font-bold hover:bg-blue-100 transition"
                >
                  Get Started
                </button>
              )}
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

export default About;