"""
MongoDB JSON Import Script

This script connects to a MongoDB database, deletes all existing records in a specified collection,
and inserts new records from JSON files in a specified directory.


"""

import os
import json
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError

# MongoDB connection details
CONNECTION_STRING = "mongodb+srv://USERNAME:PASSWORD@aflam.4i0cl.mongodb.net/?retryWrites=true&w=majority&appName=Aflam"
DATABASE_NAME = "AflamDB"
COLLECTION_NAME = "movies"
OFFERS_COLLECTION_NAME = "offers"

# Directory containing JSON files
# Note: This is the Windows path provided by the user
# For testing in this environment, we'll need to use a local path
JSON_DIR = "C:\\Users\\starx\\Desktop\\CPIT499\\Scripts"
# For testing in this environment, uncomment and modify this line:
# JSON_DIR = "/path/to/test/json/files"

def connect_to_mongodb():
    """Connect to MongoDB and return database and collection objects."""
    try:
        # Create a MongoDB client
        client = MongoClient(CONNECTION_STRING)
        
        # Verify connection by sending a ping
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")
        
        # Get database
        db = client[DATABASE_NAME]
        
        return client, db
    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

def delete_existing_records(collection):
    """Delete all existing records in the collection."""
    try:
        result = collection.delete_many({})
        print(f"Deleted {result.deleted_count} existing records from {collection.name} collection.")
    except PyMongoError as e:
        print(f"Error deleting records: {e}")
        sys.exit(1)

def insert_json_files(db, json_dir):
    """Insert all JSON files from the specified directory into the collection."""
    if not os.path.exists(json_dir):
        print(f"Error: Directory '{json_dir}' does not exist.")
        print("Please update the JSON_DIR variable in the script with the correct path.")
        return
    
    json_files = [f for f in os.listdir(json_dir) if f.endswith('.json')]
    
    if not json_files:
        print(f"No JSON files found in {json_dir}")
        return
    
    total_inserted = 0
    
    for json_file in json_files:
        file_path = os.path.join(json_dir, json_file)
        
        # Determine which collection to use
        if json_file.lower() == "offers.json":
            collection = db[OFFERS_COLLECTION_NAME]
            # Delete existing records in offers collection
            delete_existing_records(collection)
            print(f"Processing offers.json for the {OFFERS_COLLECTION_NAME} collection...")
        else:
            collection = db[COLLECTION_NAME]
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both single documents and arrays of documents
            if isinstance(data, list):
                if data:  # Check if the list is not empty
                    result = collection.insert_many(data)
                    inserted_count = len(result.inserted_ids)
                    total_inserted += inserted_count
                    print(f"Inserted {inserted_count} documents from {json_file}")
                else:
                    print(f"Skipped {json_file} (empty array)")
            else:
                result = collection.insert_one(data)
                total_inserted += 1
                print(f"Inserted 1 document from {json_file}")
                
        except json.JSONDecodeError:
            print(f"Error: {json_file} is not a valid JSON file. Skipping.")
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
    
    print(f"Total documents inserted: {total_inserted}")

def main():
    """Main function to execute the script."""
    print("Starting MongoDB JSON import process...")
    
    # Connect to MongoDB
    client, db = connect_to_mongodb()
    
    try:
        # Get the movies collection
        movies_collection = db[COLLECTION_NAME]
        
        # Delete existing records in movies collection
        delete_existing_records(movies_collection)
        
        # Insert new records from JSON files
        insert_json_files(db, JSON_DIR)
        
        print("Import process completed successfully!")
    finally:
        # Close the MongoDB connection
        client.close()
        print("MongoDB connection closed.")

if __name__ == "__main__":
    main()
