import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "./UserContext"; // Import UserContext

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setUser } = useContext(UserContext); // Access user and setUser from context

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-gray-300 text-2xl font-bold tracking-wide">
              {"Aflam"}
            </span>
          </div>

          {/* Menu for larger screens */}
          <div className="hidden md:flex space-x-4 items-center">
          <Link to="/home" className="nav-link">
            Home
            </Link>
            <Link to="/movies" className="nav-link">
            Search Movies
            </Link>
            
            <Link to="/offers" className="nav-link">
              Offers
            </Link>
            {user ? (
              <button
                onClick={() => setUser(null)} // Logs out the user
                className="nav-button"
              >
                Log Out
              </button>
            ) : (
              <Link to="/login" className="nav-button">
                Sign in
              </Link>
  
            )      }
            {/* About Us Button */}
           
          </div>

          {/* Hamburger menu for mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Dropdown menu for mobile */}
        {isOpen && (
          <div className="flex flex-col md:hidden items-center space-y-4 mt-4 pb-11">
            <Link to="/" className="dropdown-link">
              Home
            </Link>
            <Link to="/now-showing" className="dropdown-link">
              Now Showing
            </Link>
            <Link to="/coming-soon" className="dropdown-link">
              Coming Soon
            </Link>
            {user ? (
              <button
                onClick={() => setUser(null)} // Logs out the user
                className="dropdown-link"
              >
                Log Out
              </button>
            ) : (
              <Link to="/login" className="dropdown-link">
                Sign In
              </Link>
            )}
            {/* About Us Button in Mobile Dropdown */}
        
          </div>
        )}
      </div>
    </nav>
  );
}
