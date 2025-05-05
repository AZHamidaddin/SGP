// Import necessary React components, routing, context, UI components and icons
import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "./UserContext";
import Navbar from "./Navbar";
import SearchMovies from "./SearchMovies";
import { FaPen, FaPlus, FaCheckCircle, FaTimesCircle } from "react-icons/fa";



// This function takes a string and makes it lowercase, removes any special characters or spaces,
// and trims whitespace. Basically makes movie titles consistent so we can group similar ones together.
// Returns empty string if input is null/undefined
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// This function helps us pick the best movie poster from different streaming services
// For example, if we have the same movie from muvi and vox, we might prefer muvi's
// poster

const getPrioritizedImageUrl = (group, priority) => {
  // Loop through our preferred streaming services (like Netflix, Prime etc)
  for (const sourceName of priority) {
    // Look for a movie in the group that's from this streaming service
    const movie = group.find(m => m.Parent?.toUpperCase() === sourceName.toUpperCase());
    // If we found one and it has a poster, use that!
    if (movie && movie["Image URL"]) {
      return movie["Image URL"];
    }
  }
  // If we couldn't find any of our preferred posters, just use whatever we have
  // (or return empty string if we somehow have nothing)
  return group[0]?.["Image URL"] || "";
};

// This function helps us group similar movies together. For example, if we have
// "Spider-Man" from Muvi and "Spiderman" from Vox, we want to show them as one movie.
// That way users don't see duplicates in the list.

// This function takes an array of movies and groups similar movies together based on their titles.
// It returns an array of movie groups, where each group contains movies with similar titles.
// For example:
// Input: [
//   {Title: "Spider-Man", Parent: "vox"},
//   {Title: "Spiderman", Parent: "muvi"},
//   {Title: "Batman", Parent: "amc"}
// ]
// Output: [
//   [{Title: "Batman", Parent: "amc"}],
//   [{Title: "Spider-Man", Parent: "vox"}, {Title: "Spiderman", Parent: "muvi"}]
// ]

// Takes array of movie objects, returns array of arrays (groups of similar movies)
const mergeMoviesByTitle = (movies) => {
  // Initialize empty array to store movie groups
  const groups = [];
  
  // Set to track which movie indices we've already processed
  const visited = new Set(); 

  // Outer loop - iterate through each movie
  for (let i = 0; i < movies.length; i++) {
    // Skip if we already processed this movie
    if (visited.has(i)) continue;

    // Start new group with current movie
    const group = [movies[i]];
    visited.add(i); // Mark as processed
    
    // Get normalized title for comparison
    const titleA = normalize(movies[i].Title);

    // Inner loop - compare current movie with all remaining movies
    for (let j = i + 1; j < movies.length; j++) {
      if (visited.has(j)) continue; // Skip processed movies
      
      const titleB = normalize(movies[j].Title);

      // Check if either title contains the other
      // e.g. "Spider-Man" contains "Spiderman" or vice versa
      if (titleA.includes(titleB) || titleB.includes(titleA)) {
        group.push(movies[j]); // Add to current group
        visited.add(j); // Mark as processed
      }
    }

    // Add completed group to groups array
    groups.push(group);
  }

  // Sort all groups alphabetically by first movie's title
  // localeCompare handles case and diacritics
  return groups.sort((a, b) => 
    a[0].Title.localeCompare(b[0].Title, undefined, {sensitivity: "base"})
  );
};

// Start 
const AllMovies = () => {
  // Initialize state variables for:
  // - User context and authentication
  // - Movie groups and their metadata (titles, watched status, etc.)
  // - UI states (loading, modals, messages, errors)
  // - Image display properties
  const { user, setUser } = useContext(UserContext);
  const [movieGroups, setMovieGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedTitles, setEditedTitles] = useState({});
  const [errors, setErrors] = useState({});
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [imageAspectRatios, setImageAspectRatios] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);


  const isAdmin = user?.isAdmin ?? false; // If isAdmin is null, set it to false by default

  // useEffect is like telling React "hey, run this code when the component first appears on screen"
  // The empty [] at the end means "only run once" - if we put something in there, it would run again when that thing changes
  useEffect(() => {
    // First, we fetch all movies from our backend server
    // Think of this like sending a waiter to the kitchen to get our menu items
    fetch("http://localhost:5000/movies")
      .then((res) => res.json()) // Convert the response to a format JavaScript understands
      .then((data) => {
        // Now that we have our movies, let's organize them
        // Sometimes movies appear multiple times with slightly different titles
        // mergeMoviesByTitle helps us group these similar movies together
        // If we don't get any data (data is null/undefined), we'll use an empty array instead
        const grouped = mergeMoviesByTitle(data || []); 
        
        // Save these organized movies in our component's memory (state)
        setMovieGroups(grouped);
        
        // Everything's ready! Let's turn off the loading spinner
        setLoading(false);
      })
      .catch((err) => {
        // Uh oh, something went wrong (like if the server is down)
        console.error(err);
        // Still need to turn off the loading spinner so users know something's wrong
        setLoading(false);
      });
  }, []); // Remember, the empty [] means "just once, please!"

  // This function helps us figure out the shape of each movie poster image when it loads
  // We need this to display the images nicely in our grid layout
  const handleImageLoad = (event, url) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalHeight > 0) { // Avoid division by zero
      const aspectRatio = naturalWidth / naturalHeight;
      setImageAspectRatios(prev => ({ ...prev, [url]: aspectRatio }));
    } else {
      // Handle cases where height is 0 or image fails to load dimension data
      setImageAspectRatios(prev => ({ ...prev, [url]: 1 })); // Default to aspect ratio 1 (square-ish)
    }
  };

  // When an admin edits a movie title, this keeps track of the changes
  // before they hit save. It's like writing a draft before submitting.
  // We store all edited titles in a big object where each movie ID points
  // to its new title - this way we can edit multiple movies at once!
  const handleTitleChange = (e, mainMovieId) => {
    setEditedTitles((prev) => ({
      ...prev,
      [mainMovieId]: e.target.value,
    }));
  };

  // Handle movie update submission (for admins)
  const handleEditSubmit = async (mainMovieId, newTitle) => {
    // Find the group associated with this mainMovieId
    const groupToUpdate = movieGroups.find(group => group[0]._id === mainMovieId);
    if (!groupToUpdate) {
      console.error("Could not find group to update for ID:", mainMovieId);
      setErrors({ general: "Error finding movie group to update." });
      return;
    }

    

    // This code updates a movie's title in the database. If successful, it refreshes the movie list
    // to show the updated title and clears the edit form. If anything goes wrong, it shows an error.
    try {
      const response = await fetch(`http://localhost:5000/movies/${mainMovieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: newTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.message || "Error updating movie title" });
      } else {
        fetch("http://localhost:5000/movies")
          .then((res) => res.json())
          .then((updatedData) => {
            const grouped = mergeMoviesByTitle(updatedData || []);
            setMovieGroups(grouped);
          })
          .catch((err) => console.error("Error fetching updated data:", err));

        setEditedTitles((prev) => ({ ...prev, [mainMovieId]: undefined }));
        alert("Movie title updated successfully!");
      }
    } catch (err) {
      setErrors({ general: "Error updating movie title" });
      console.error("Error updating title:", err);
    }
  };

  // Sort movie groups alphabetically based on the main movie's title
  const sortMovieGroups = () => {
    const sortedGroups = [...movieGroups].sort((a, b) =>
      a[0].Title.localeCompare(b[0].Title, undefined, { sensitivity: 'base' })
    );
    setMovieGroups(sortedGroups);
  };

  // Handle adding a movie to watched list (adds the main movie of the group)
  const handleAddToWatched = async (mainMovie, selectedSource) => {
    if (!user || (!user._id && !user.id)) {
      alert("Please log in to add movies to your watch history.");
      return;
    }
  
    const userId = user._id || user.id;
  
    const movieDetails = {
      _id: mainMovie._id,
      Title: mainMovie.Title,
      Language: mainMovie.Language,
      Parent: selectedSource,
      image_url: mainMovie["Image URL"],
      date: new Date().toISOString().split("T")[0],
    };
  
    try {
      const response = await fetch("http://localhost:5000/api/users/watch-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, movie: movieDetails }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        const msg =
          response.status === 400 && data.message === "Movie already in watch history"
            ? `"${mainMovie.Title}" is already in your watch history.`
            : data.message || "Error adding movie to watch history";
  
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setSuccessMessage(`Added "${mainMovie.Title}" to your watch history.`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
  
        setWatchedMovies((prev) => [...prev, mainMovie]);
        if (data.watchHistory && setUser) {
          setUser({
            ...user,
            userViewHistory: data.watchHistory,
            total_movies: data.total_movies,
          });
        }
      }
    } catch (error) {
      console.error("Error adding movie to watch history:", error);
      setSuccessMessage("Failed to add movie to watch history. Please try again.");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  };
  
  
  

    if (loading) {
    return (
      <div className="loading-screen flex items-center justify-center h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
        <p className="text-white text-2xl font-semibold">Ali is hot for you...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="w-full bg-gray-950 shadow-md">
        <Navbar />
      </div>

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">All Movies</h1>
        <SearchMovies />

        <div className="text-center mb-8">
         
        </div>

        {errors.general && (
          <div className="bg-red-700 text-white p-3 rounded mb-4 text-center">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
          {movieGroups.map((group, index) => {
            const main = group[0]; // Use the first movie in the group as the primary reference
            const priority = ['VOX', 'Muvi', 'Empire', 'AMC'];
            const imageUrl = getPrioritizedImageUrl(group, priority);

            // Determine classes based on aspect ratio
            const aspectRatio = imageAspectRatios[imageUrl];
            let wrapperClass = 'h-[350px] w-full flex items-center justify-center bg-gray-800 rounded-t-lg overflow-hidden';
            let imageClass = '';

            if (aspectRatio === undefined) {
              wrapperClass += ' animate-pulse';
              imageClass = 'opacity-0';
            } else {
              imageClass = 'object-contain w-full h-full'; // Always contain image fully
            }

            return (
              <div
                key={main._id || index} // Use main movie's ID as key
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform relative flex flex-col h-[500px]"
              >
                {/* Image Wrapper for consistent aspect ratio and centering */}
                <div className={wrapperClass}>
                  <img
                    src={imageUrl} // Use the prioritized image URL
                    alt={main.Title}
                    onLoad={(e) => handleImageLoad(e, imageUrl)} // Add onLoad handler
                    className={`transition-opacity duration-300 ${imageClass}`} // Apply dynamic class for img content
                  />
                </div>
                {/* Text Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold flex justify-between items-center">
                    {isAdmin ? (
                      <div className="flex items-center w-full">
                        <input
                          type="text"
                          value={editedTitles[main._id] !== undefined ? editedTitles[main._id] : main.Title}
                          onChange={(e) => handleTitleChange(e, main._id)}
                          className="text-lg font-bold bg-transparent border-none text-white focus:ring-2 focus:ring-purple-500 w-full mr-8" // Added margin-right for button space
                          placeholder="Enter new title"
                        />
                        <button
                          onClick={() => handleEditSubmit(main._id, editedTitles[main._id] !== undefined ? editedTitles[main._id] : main.Title)}
                          className="ml-2 text-blue-600 cursor-pointer hover:text-blue-200 absolute right-4 bottom-[100px] transform -translate-y-1/2" // Adjusted positioning slightly
                          title="Save Title Change"
                          disabled={editedTitles[main._id] === undefined} // Disable if no change
                        >
                          <FaPen />
                        </button>
                      </div>
                    ) : (
                      <span>{main.Title}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {main.Language?.charAt(0).toUpperCase() + main.Language?.slice(1).toLowerCase()}
                  </p>
                  <div className="mt-auto">
                    <Link
                      to={`/movie/${main._id}`} // Link to the main movie's details page
                      className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-2 rounded-lg transition"
                    >
                      View Details
                    </Link>

                    {!isAdmin && (
  watchedMovies.some((m) => m._id === main._id) ? (
    <div className="mt-3 inline-block w-full text-center font-semibold text-red-500 bg-red-100/10 py-2 rounded-lg border border-red-600">
  <FaPlus className="inline mr-1" /> Already Watched
</div>

  ) : (
    <button
      onClick={() => {
        setSelectedMovie(main);
        setShowModal(true);
      }}
      className="mt-3 inline-block text-green-500 hover:text-green-400 w-full text-center"
    >
      <FaPlus className="inline mr-1" /> Add to Watched  
    </button>
  )
)}

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
      {showModal && (
 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
 <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-80 text-white">
   <h2 className="text-xl font-semibold mb-4 text-center">Select a Cinema Source</h2>
   <div className="space-y-2">
     {["Vox", "AMC", "Muvi", "Empire", "Online"].map((source) => (
       <button
         key={source}
         className="w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-blue-600 transition"
         onClick={() => {
           handleAddToWatched(selectedMovie, source);
           setShowModal(false);
           setSelectedMovie(null);
         }}
       >
         {source}
       </button>
     ))}
   </div>
 </div>
</div>

)}

{showSuccess && (
  <div
    className="fixed top-[100px] right-5 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 z-50 flex items-center gap-4"
    style={{ borderColor: successMessage.includes("already") ? "#dc2626" : "#16a34a" }} // red-600 or green-600
  >
    {successMessage.includes("already") ? (
      <FaTimesCircle className="text-red-500 w-6 h-6" />
    ) : (
      <FaCheckCircle className="text-green-400 w-6 h-6" />
    )}
    <div>
      <p className="font-semibold">Success</p>
      <p className="text-sm text-gray-300">{successMessage}</p>
    </div>
  </div>
)}




    </div>
  );
};

export default AllMovies;
