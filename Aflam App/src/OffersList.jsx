import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Formats text by capitalizing first letter of each word
// e.g. "HELLO WORLD" -> "Hello World"
const formatTitle = (text) =>
  text?.toLowerCase().split(" ").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");

// Returns Tailwind background color classes based on cinema brand
// VOX -> blue, MUVI -> pink, AMC -> red, Empire -> amber
const getTagColor = (parent) => {
  switch (parent.toLowerCase()) {
    case "vox": return "bg-blue-500";
    case "muvi": return "bg-pink-500";
    case "amc": return "bg-red-600";
    case "empire": return "bg-amber-900";
    default: return "bg-gray-500";
  }
};

const OffersGrid = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/offers")
      .then((res) => res.json())
      .then((data) => {
        const trimmed = (data.offers || []).filter(o => o["offer title"]?.trim()).slice(0, 3);
        setOffers(trimmed);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-10 text-white">Loading offers...</div>;

  return (
    <div className="bg-gray-900 text-white py-10">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl font-bold text-center mb-8">🎟️ Featured Offers</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <a
              key={offer._id}
              href={offer["offer URL"]}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-800 hover:bg-gray-700 shadow-md rounded-lg overflow-hidden transition duration-300"
            >
              <div className="h-40 bg-gray-700 overflow-hidden">
                <img
                  src={offer.offer_image}
                  alt={offer["offer title"]}
                  className="object-cover h-full w-full"
                />
              </div>
              <div className="p-4 text-center space-y-2">
                <p className="text-sm font-medium text-white line-clamp-2">
                  {formatTitle(offer["offer title"])}
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs text-white rounded-full ${getTagColor(
                    offer.parent
                  )}`}
                >
                  {offer.parent}
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/offers"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            View All Offers
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OffersGrid;
