require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors()); // Allows frontend to call the API
app.use(express.json()); // Parses JSON request bodies

// ✅ MongoDB Connection
// ✅ MongoDB Connection (Updated)
mongoose.connect(process.env.MONGO_URI, {
  dbName: "AflamDB"  // Explicitly select the database
})
  .then(() => {
    console.log("✅ MongoDB Connected to AflamDB");

    // Print all database objects on server start
    printAllDatabaseObjects();
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Function to print all database objects
async function printAllDatabaseObjects() {
  try {
    console.log("\n🔍 PRINTING ALL DATABASE OBJECTS ON SERVER START 🔍");

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`Found ${collectionNames.length} collections: ${collectionNames.join(', ')}`);

    // Loop through each collection and count documents
    let totalDocuments = 0;
    for (const collectionName of collectionNames) {
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      console.log(`Collection '${collectionName}': ${count} documents`);
      totalDocuments += count;

      // Print first document as sample (if exists)
      if (count > 0) {
        const sampleDoc = await mongoose.connection.db.collection(collectionName).findOne();
        console.log(`Sample document from '${collectionName}':`);
        console.log(JSON.stringify(sampleDoc, null, 2));
        console.log("-------------------------------------");
      }
    }

    console.log(`Total documents across all collections: ${totalDocuments}`);
    console.log("🔍 DATABASE PRINT COMPLETE 🔍\n");
  } catch (error) {
    console.error("Error printing database objects on startup:", error);
  }
}

// ✅ Define Movie Schema (Matches Your MongoDB Structure)
const MovieSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  identifier: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  image_url: { type: String, required: true },
  classification: { type: String, required: true },
  language: { type: String, required: true },
  showtimes_url: { type: String },

  // Stores dynamic dates with day_of_week and showtimes array
  timings: {
    type: Map,
    of: new mongoose.Schema({
      day_of_week: { type: String, required: true },
      showtimes: [
        {
          place: { type: String, required: true },
          experiences: [
            {
              name: { type: String, required: true },
              times: [{ type: String }]
            }
          ]
        }
      ]
    })
  }
});

const Movie = mongoose.model("Movie", MovieSchema);

// ✅ API Endpoints

// 1️⃣ Get All Movies

app.get("/test", async (req, res) => {
  try {
    const testData = await Movie.findOne();
    res.json(testData || { message: "No movies found in database!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection error" });
  }
});

// Search movies by title or description
app.get("/movies/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Create a case-insensitive search regex
    const searchRegex = new RegExp(query, 'i');

    // Search in title and description fields
    const movies = await Movie.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    });

    res.json(movies);
  } catch (error) {
    console.error("Error searching movies:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// 2️⃣ Get Movies by Date
app.get("/movies/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const movies = await Movie.find({ [`timings.${date}`]: { $exists: true } });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 3️⃣ Get Movies by Cinema Name
app.get("/movies/cinema/:cinema", async (req, res) => {
  try {
    const { cinema } = req.params;
    const movies = await Movie.find({ [`timings.*.showtimes.place`]: cinema });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all movies
app.get("/movies", async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get a specific movie by slug
app.get("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const movie = await Movie.findOne({ slug });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    console.error("Error fetching movie by slug:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/debug", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const moviesCount = await Movie.countDocuments();

    res.json({
      collections: collections.map(col => col.name), // Shows all collection names
      moviesInDatabase: moviesCount // Shows how many movies exist
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection error", details: error });
  }
});

app.get("/debug-movies", async (req, res) => {
  try {
    const testData = await mongoose.connection.db.collection("movies").findOne();
    console.log("Fetched from MongoDB:", testData);
    res.json(testData || { message: "No movies found in database!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection error", details: error });
  }
});

// Create a new movie
app.post("/movies", async (req, res) => {
  try {
    const movieData = req.body;

    // Validate required fields
    if (!movieData.title || !movieData.slug || !movieData.identifier || !movieData.image_url ||
      !movieData.classification || !movieData.language) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["title", "slug", "identifier", "image_url", "classification", "language"]
      });
    }

    // Check if movie with same slug or identifier already exists
    const existingMovie = await Movie.findOne({
      $or: [{ slug: movieData.slug }, { identifier: movieData.identifier }]
    });

    if (existingMovie) {
      return res.status(409).json({
        error: "Movie with this slug or identifier already exists"
      });
    }

    // Create and save the new movie
    const newMovie = new Movie(movieData);
    await newMovie.save();

    res.status(201).json(newMovie);
  } catch (error) {
    console.error("Error creating movie:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Update a movie by slug
app.put("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const updateData = req.body;

    // Don't allow changing the slug through this endpoint
    if (updateData.slug && updateData.slug !== slug) {
      return res.status(400).json({
        error: "Cannot change slug through this endpoint"
      });
    }

    // Find and update the movie
    const updatedMovie = await Movie.findOneAndUpdate(
      { slug },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(updatedMovie);
  } catch (error) {
    console.error("Error updating movie:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Delete a movie by slug
app.delete("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Find and delete the movie
    const deletedMovie = await Movie.findOneAndDelete({ slug });

    if (!deletedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json({ message: "Movie deleted successfully", movie: deletedMovie });
  } catch (error) {
    console.error("Error deleting movie:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Print all database objects to console
app.get("/print-all-data", async (req, res) => {
  try {
    // Get all movies from the database
    const allMovies = await Movie.find();

    // Print the entire collection to console
    console.log("========== ALL DATABASE OBJECTS ==========");
    console.log(JSON.stringify(allMovies, null, 2));
    console.log("==========================================");

    // Count the number of documents
    const count = allMovies.length;
    console.log(`Total number of documents: ${count}`);

    // Return the data in the response as well
    res.json({
      message: `Successfully printed ${count} documents to console`,
      count: count,
      data: allMovies
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Print all collections and their data
app.get("/print-all-collections", async (req, res) => {
  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log("========== ALL DATABASE COLLECTIONS ==========");
    console.log("Collections found:", collectionNames);

    // Object to store all collection data
    const allData = {};
    let totalDocuments = 0;

    // Loop through each collection and get its data
    for (const collectionName of collectionNames) {
      const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      allData[collectionName] = documents;

      // Print each collection's data
      console.log(`\n---------- COLLECTION: ${collectionName} (${documents.length} documents) ----------`);
      console.log(JSON.stringify(documents, null, 2));

      totalDocuments += documents.length;
    }

    console.log("\n==============================================");
    console.log(`Total collections: ${collectionNames.length}`);
    console.log(`Total documents across all collections: ${totalDocuments}`);

    // Return summary in the response
    res.json({
      message: `Successfully printed ${totalDocuments} documents from ${collectionNames.length} collections`,
      collections: collectionNames,
      documentCounts: Object.fromEntries(
        Object.entries(allData).map(([name, docs]) => [name, docs.length])
      ),
      data: allData
    });
  } catch (error) {
    console.error("Error fetching collections data:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Print all documents from a specific collection
app.get("/print-collection/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;

    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ error: `Collection '${collectionName}' not found` });
    }

    // Get all documents from the collection
    const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();

    // Print the collection data
    console.log(`\n========== COLLECTION: ${collectionName} (${documents.length} documents) ==========`);
    console.log(JSON.stringify(documents, null, 2));
    console.log("==============================================");

    // Return the data in the response
    res.json({
      message: `Successfully printed ${documents.length} documents from collection '${collectionName}'`,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error(`Error fetching collection '${req.params.collectionName}':`, error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies showing at Empire cinema
app.get("/movies/cinema/empire", async (req, res) => {
  try {
    // Find all movies that have Empire as a place in any of their showtimes
    const movies = await Movie.find({});

    // Filter movies that have Empire as a cinema
    const empireMovies = movies.filter(movie => {
      // Check if the movie has timings
      if (!movie.timings || movie.timings.size === 0) return false;

      // Convert Map to object for easier processing
      const timingsObj = Object.fromEntries(movie.timings);

      // Check each date's showtimes
      for (const date in timingsObj) {
        const dateData = timingsObj[date];

        // Check if any showtime has Empire as the place
        for (const showtime of dateData.showtimes || []) {
          if (showtime.place.toLowerCase().includes('empire')) {
            return true;
          }
        }
      }

      return false;
    });

    // Log the results
    console.log(`Found ${empireMovies.length} movies showing at Empire cinema`);

    res.json({
      count: empireMovies.length,
      movies: empireMovies
    });
  } catch (error) {
    console.error("Error fetching Empire cinema movies:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get movies by cinema name with flexible matching options
app.get("/movies/by-cinema", async (req, res) => {
  try {
    const { name, exact = false } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Cinema name is required" });
    }

    // Find all movies
    const movies = await Movie.find({});

    // Filter movies by cinema name
    const filteredMovies = movies.filter(movie => {
      // Check if the movie has timings
      if (!movie.timings || movie.timings.size === 0) return false;

      // Convert Map to object for easier processing
      const timingsObj = Object.fromEntries(movie.timings);

      // Check each date's showtimes
      for (const date in timingsObj) {
        const dateData = timingsObj[date];

        // Check if any showtime has the specified cinema as the place
        for (const showtime of dateData.showtimes || []) {
          if (exact) {
            // Exact match (case insensitive)
            if (showtime.place.toLowerCase() === name.toLowerCase()) {
              return true;
            }
          } else {
            // Partial match (case insensitive)
            if (showtime.place.toLowerCase().includes(name.toLowerCase())) {
              return true;
            }
          }
        }
      }

      return false;
    });

    // Log the results
    console.log(`Found ${filteredMovies.length} movies showing at cinema matching "${name}"`);

    // Return the filtered movies
    res.json({
      cinema: name,
      exact_match: exact === 'true' || exact === true,
      count: filteredMovies.length,
      movies: filteredMovies
    });
  } catch (error) {
    console.error("Error fetching movies by cinema:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get detailed showtimes for movies at Empire cinemas
app.get("/empire/showtimes", async (req, res) => {
  try {
    // Get optional date filter from query params
    const { date } = req.query;

    // Find all movies
    const movies = await Movie.find({});

    // Process movies to extract Empire showtimes
    const empireShowtimes = [];

    for (const movie of movies) {
      // Skip movies without timings
      if (!movie.timings || movie.timings.size === 0) continue;

      // Convert Map to object for easier processing
      const timingsObj = Object.fromEntries(movie.timings);

      // Filter dates if date parameter is provided
      const datesToProcess = date ? (timingsObj[date] ? [date] : []) : Object.keys(timingsObj);

      // Check each date's showtimes
      const movieEmpireShowtimes = {};

      for (const currentDate of datesToProcess) {
        const dateData = timingsObj[currentDate];

        // Find Empire showtimes for this date
        const empirePlaces = [];

        for (const showtime of dateData.showtimes || []) {
          if (showtime.place.toLowerCase().includes('empire')) {
            empirePlaces.push({
              place: showtime.place,
              experiences: showtime.experiences
            });
          }
        }

        // If we found Empire showtimes for this date, add them to the result
        if (empirePlaces.length > 0) {
          if (!movieEmpireShowtimes.dates) {
            movieEmpireShowtimes.dates = {};
          }

          movieEmpireShowtimes.dates[currentDate] = {
            day_of_week: dateData.day_of_week,
            showtimes: empirePlaces
          };
        }
      }

      // If this movie has Empire showtimes, add it to the result
      if (movieEmpireShowtimes.dates && Object.keys(movieEmpireShowtimes.dates).length > 0) {
        empireShowtimes.push({
          slug: movie.slug,
          title: movie.title,
          image_url: movie.image_url,
          classification: movie.classification,
          language: movie.language,
          ...movieEmpireShowtimes
        });
      }
    }

    // Log the results
    console.log(`Found ${empireShowtimes.length} movies with Empire showtimes${date ? ` on ${date}` : ''}`);

    // Return the Empire showtimes
    res.json({
      count: empireShowtimes.length,
      date_filter: date || null,
      movies: empireShowtimes
    });
  } catch (error) {
    console.error("Error fetching Empire showtimes:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "Empire"
app.get("/movies/parent/empire", async (req, res) => {
  try {
    // Find all movies where Parent field is "Empire"
    const empireMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Empire" }).toArray();

    // Log the results
    console.log(`Found ${empireMovies.length} movies with Parent = "Empire"`);
    console.log(JSON.stringify(empireMovies, null, 2));

    // Return the movies
    res.json({
      count: empireMovies.length,
      movies: empireMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Empire:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "AMC"
app.get("/movies/parent/amc", async (req, res) => {
  try {
    // Find all movies where Parent field is "AMC"
    const amcMovies = await mongoose.connection.db.collection("movies").find({ Parent: "AMC" }).toArray();

    // Log the results
    console.log(`Found ${amcMovies.length} movies with Parent = "AMC"`);
    console.log(JSON.stringify(amcMovies, null, 2));

    // Return the movies
    res.json({
      count: amcMovies.length,
      movies: amcMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = AMC:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "Vox"
app.get("/movies/parent/vox", async (req, res) => {
  try {
    // Find all movies where Parent field is "Vox"
    const voxMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Vox" }).toArray();

    // Log the results
    console.log(`Found ${voxMovies.length} movies with Parent = "Vox"`);
    console.log(JSON.stringify(voxMovies, null, 2));

    // Return the movies
    res.json({
      count: voxMovies.length,
      movies: voxMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Vox:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});

// Get all movies with Parent = "Muvi"
app.get("/movies/parent/muvi", async (req, res) => {
  try {
    // Find all movies where Parent field is "Muvi"
    const muviMovies = await mongoose.connection.db.collection("movies").find({ Parent: "Muvi" }).toArray();

    // Log the results
    console.log(`Found ${muviMovies.length} movies with Parent = "Muvi"`);
    console.log(JSON.stringify(muviMovies, null, 2));

    // Return the movies
    res.json({
      count: muviMovies.length,
      movies: muviMovies
    });
  } catch (error) {
    console.error("Error fetching movies with Parent = Muvi:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
});




// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



