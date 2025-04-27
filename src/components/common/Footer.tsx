// src/components/common/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
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
  );
};

export default Footer;