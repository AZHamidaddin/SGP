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
              Your ultimate movie guide experience.
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
        </div>
      </div>
    </footer>
  );
}
