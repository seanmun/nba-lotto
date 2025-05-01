// src/components/common/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Twitter, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-bold">Trust The Pick</h3>
            <p className="text-gray-400 text-sm">Fantasy league draft lottery platform</p>
          </div>
          <div className="flex flex-wrap space-x-4">
            <Link to="/about" className="text-gray-300 hover:text-white transition text-sm">
              How It Works
            </Link>
            <a href="#" className="text-gray-300 hover:text-white transition text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition text-sm">
              Support
            </a>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-4 mt-2">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm text-center md:text-left mb-3 md:mb-0">
              © 2025 TrustThePick<br />
              Built and maintained by Sean Munley<br />
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://linkedin.com/in/sean-munley" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a 
                href="https://twitter.com/seanmun" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://seanmun.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="Personal Website"
              >
                <Globe size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;