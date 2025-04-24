import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";

const formatTitle = (text) =>
  text?.toLowerCase().split(" ").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");

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
        setOffers((data.offers || []).filter(o => o["offer title"]?.trim()));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="w-full bg-gray-950 shadow-md">
        <Navbar />
      </div>

      <div className="p-6">
        <h2 className="text-3xl font-bold text-center mb-8">🎬 All Cinema Offers</h2>
        {loading ? (
          <div className="text-center py-10">Loading offers...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {offers.map((offer) => (
              <a
                key={offer._id}
                href={offer["offer URL"]}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white shadow rounded-lg overflow-hidden hover:shadow-xl transition duration-300"
              >
                <div className="h-40 bg-gray-100 overflow-hidden">
                  <img src={offer.offer_image} alt={offer["offer title"]} className="object-cover h-full w-full" />
                </div>
                <div className="p-3 text-center space-y-1">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {formatTitle(offer["offer title"])}</p>
                  <span className={`inline-block px-2 py-1 text-xs text-white rounded-full ${getTagColor(offer.parent)}`}>
                    {offer.parent}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Back to Home Button */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AllOffers;
