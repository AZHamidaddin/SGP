import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MovieGrid from "./MovieGrid";
import SearchMovies from "./SearchMovies";

export default function Home() {
  const location = useLocation();
  const user = location.state?.user || "Guest"; // Retrieve the user name from location state


 
  return (
    
    <div className="min-h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500 text-white">
        <Navbar />

        <SearchMovies/>
        <MovieGrid/>
      
      
      <Footer/>
    </div>
  );
}
