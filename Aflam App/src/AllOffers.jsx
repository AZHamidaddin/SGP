import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";

// This function takes a text string and formats it to title case
// For example: "hello world" becomes "Hello World"
// Returns undefined if input is null/undefined
const formatTitle = (text) =>
  text?.toLowerCase().split(" ").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");

// This function takes a cinema parent name and returns the corresponding Tailwind CSS
// background color class. For example: "vox" returns "bg-blue-500"
// Returns a default gray color if the parent is not recognized
const getTagColor = (parent) => {
  switch (parent.toLowerCase()) {
    case "vox": return "bg-blue-500";
    case "muvi": return "bg-pink-500";
    case "amc": return "bg-red-600";
    case "empire": return "bg-amber-900";
    default: return "bg-gray-500";
  }
};

const AllOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/offers")
      .then((res) => res.json())
      .then((data) => {
        const validOffers = (data.offers || []).filter(o => o["offer title"]?.trim());
        setOffers(validOffers);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching offers:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <div className="w-full bg-gray-950 shadow-lg sticky top-0 z-50">
        <Navbar />
      </div>

      <div className="container mx-auto p-8">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">🎬 All Cinema Offers</h2>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
            <span className="ml-4 text-lg text-gray-300">Loading offers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {offers.map((offer) => (
              <a
                key={offer._id}
                href={offer["offer URL"]}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-gray-800 border border-gray-700 shadow-lg rounded-lg overflow-hidden hover:shadow-xl hover:border-gray-600 transform hover:-translate-y-1 transition-all duration-300 ease-in-out"
              >
                <div className="aspect-video bg-gray-700 overflow-hidden">
                  <img
                    src={offer.offer_image}
                    alt={offer["offer title"] ? `Offer: ${offer["offer title"]}` : 'Cinema Offer'}
                    className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300 ease-in-out"
                  />
                </div>
                <div className="p-4 text-center space-y-2">
                  <p className="text-base font-semibold text-gray-100 line-clamp-2 h-12">
                    {formatTitle(offer["offer title"])}
                  </p>
                  <span className={`inline-block px-2.5 py-0.5 text-xs font-medium text-white rounded-full ${getTagColor(offer.parent)}`}>
                    {offer.parent}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            to="/"
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold shadow hover:shadow-md transition-all duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AllOffers;
