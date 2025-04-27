import React from "react";
import { FaDownload } from "react-icons/fa"; // Import a download icon
import PrivacyPolicyPDF from "./data/PrivacyPolicyforAflam.pdf"; // Import the file
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="flex flex-wrap justify-between items-center">
          {/* Logo and Tagline */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Aflam</h3>
            <p className="text-sm text-gray-400">
              Your ultimate movie booking experience.
            </p>
          </div>

          {/* Links */}
                  <div className="flex space-x-6 items-center">
                  <Link
          to="/aboutus"
          className="text-gray-300 hover:text-white transition duration-300"
        >
  About Us
</Link>
            <a
              href={PrivacyPolicyPDF} // Use imported file
              download="PrivacyPolicyforAflam.pdf" // Specify download name
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition duration-300"
            >
              <span>Privacy Policy</span>
              <FaDownload className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-700" />

        {/* Bottom Section */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            &copy; 2024 Aflam. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex space-x-4">
            <a
              href="#"
              className="text-gray-300 hover:text-white transition duration-300"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.04C6.477 2.04 2 6.52 2 12.05 2 16.93 5.66 21 10.4 22v-7.03H7.83V12h2.57V9.72c0-2.54 1.56-3.93 3.84-3.93 1.09 0 2.2.19 2.2.19v2.42h-1.24c-1.22 0-1.61.75-1.61 1.52v1.84h2.73l-.44 2.98H13.6V22c4.74-1 8.4-5.07 8.4-9.95 0-5.53-4.48-10.01-10-10.01z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-white transition duration-300"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M24 4.56c-.89.4-1.85.67-2.85.8a4.92 4.92 0 0 0 2.16-2.72 9.86 9.86 0 0 1-3.12 1.2 4.92 4.92 0 0 0-8.38 4.5 13.94 13.94 0 0 1-10.12-5.14A4.92 4.92 0 0 0 4.2 9.86a4.9 4.9 0 0 1-2.23-.6v.06a4.92 4.92 0 0 0 3.95 4.83 4.92 4.92 0 0 1-2.22.08 4.93 4.93 0 0 0 4.59 3.42 9.86 9.86 0 0 1-6.1 2.1c-.39 0-.78-.02-1.17-.07a13.94 13.94 0 0 0 7.57 2.2c9.07 0 14.02-7.52 14.02-14.02 0-.21 0-.42-.02-.63A10.02 10.02 0 0 0 24 4.56z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-white transition duration-300"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C6.486 2 2 6.487 2 12c0 4.991 3.657 9.128 8.438 9.877v-6.998h-2.54V12h2.54V9.745c0-2.506 1.493-3.89 3.774-3.89 1.095 0 2.237.194 2.237.194v2.46h-1.258c-1.241 0-1.622.772-1.622 1.56v1.879h2.773l-.443 2.879h-2.33V22c4.781-.749 8.438-4.886 8.438-9.877C22 6.487 17.514 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
