import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MovieGrid from "./MovieGrid";
import SearchMovies from "./SearchMovies";
import OffersList from "./OffersList";
import UserInfo from "./UserInfo";
import { UserContext } from "./UserContext";
  
export default function Home() {
  const { user } = useContext(UserContext); // Access user from context

  return (
    <div className="min-h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500 text-white">
      <Navbar />
      
      {/* Show user info only if logged in */}
      {user && <UserInfo />}


     
      <MovieGrid />

      <OffersList/>
      
      <Footer />
    </div>
  );
}
