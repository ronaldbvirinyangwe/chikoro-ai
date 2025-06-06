// Database check script to diagnose missing email issue
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Get MongoDB URI from environment
const MONGO_URI = process.env.MONGO_URI;
const USER_ID = '67317c829a0fa2ed99102e09'; // User ID from logs

// Helper function to extract database name from MongoDB URI
function extractDatabaseName(uri) {
  try {
    const uriRegex = /\/([^/?]+)(\?|$)/;
    const matches = uri.match(uriRegex);
    if (matches && matches[1]) {
      return matches[1];
    }
    return 'authentication'; // Default fallback
  } catch (err) {
    return 'authentication'; // Default fallback
  }
}

// Helper function to sanitize user document for logging
function sanitizeUserDoc(doc) {
  if (!doc) return null;
  
  const sanitized = { ...doc };
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.passwordHash) sanitized.passwordHash = '[REDACTED]';
  if (sanitized.token) sanitized.token = '[REDACTED]';
  
  return sanitized;
}

async function checkDatabase() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not found in environment variables');
    return;
  }

  console.log(`Connecting to MongoDB using URI: ${MONGO_URI.substring(0, 20)}...`);
  
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // First, list all available databases
    console.log('\n--- AVAILABLE DATABASES ---');
    const adminDb = client.db('admin');
    const databaseList = await adminDb.admin().listDatabases();
    
    console.log('All databases on this MongoDB instance:');
    for (const db of databaseList.databases) {
      console.log(` - ${db.name} (${db.sizeOnDisk} bytes)`);
    }
    
    // Check multiple possible database names - prioritize mydatabase based on the database list
    const possibleDbNames = [
      'studentDB',                    // Found in the database list
      'mydatabase',                   // Found in the database list
      'history',                      // Found in the database list
      extractDatabaseName(MONGO_URI), // Extract from URI
      'authentication',               // Default from URI
      'chikoro_ai',                   // Default from env
      'your_database_name',           // Placeholder in .env
      'chikoroai',                    // Possible variation
      'users',                        // Common name
    ];
    
    // Loop through each possible database
    for (const dbName of possibleDbNames) {
      if (!databaseList.databases.some(db => db.name === dbName)) {
        console.log(`\nDatabase '${dbName}' does not exist, skipping...`);
        continue;
      }
      
      console.log(`\n--- EXAMINING DATABASE: ${dbName} ---`);
      const db = client.db(dbName);
      
      // List all collections in the database
      const collections = await db.listCollections().toArray();
      console.log(`Collections in '${dbName}' database:`);
      
      if (collections.length === 0) {
        console.log(`  No collections found in database '${dbName}'`);
        continue;
      }
      
      // List all collections
      collections.forEach(coll => console.log(` - ${coll.name}`));
      
      // Check ALL collections in the database
      for (const coll of collections) {
        const collName = coll.name;
        console.log(`\nExamining collection '${collName}' in database '${dbName}'...`);
        
        const collection = db.collection(collName);
        
        // Get total count of documents
        const totalCount = await collection.countDocuments({});
        console.log(`Total documents in '${collName}': ${totalCount}`);
        
        if (totalCount === 0) {
          console.log(`No documents found in '${collName}' collection`);
          continue;
        }
        
        // Check for our specific user ID - try multiple formats and fields
        try {
          console.log(`Searching for user with ID: ${USER_ID} in '${dbName}.${collName}'`);
          
          // Try as ObjectId in _id field
          let userDoc = await collection.findOne({ _id: new ObjectId(USER_ID) });
          
          // If not found, try as string in _id field
          if (!userDoc) {
            userDoc = await collection.findOne({ _id: USER_ID });
          }
          
          // If not found, try in user_id field (both formats)
          if (!userDoc) {
            userDoc = await collection.findOne({ user_id: new ObjectId(USER_ID) });
          }
          
          if (!userDoc) {
            userDoc = await collection.findOne({ user_id: USER_ID });
          }
          
          // Try in userId field (both formats)
          if (!userDoc) {
            userDoc = await collection.findOne({ userId: new ObjectId(USER_ID) });
          }
          
          if (!userDoc) {
            userDoc = await collection.findOne({ userId: USER_ID });
          }
          
          // If found user document in any field
          if (userDoc) {
            console.log(`>>> FOUND USER in '${dbName}.${collName}':`);
            console.log(JSON.stringify(sanitizeUserDoc(userDoc), null, 2));
            
            // Check for email field specifically
            if (userDoc.email) {
              console.log(`>>> User has email field: ${userDoc.email}`);
              console.log(`>>> SOLUTION: Update MONGO_URI in .env to use database '${dbName}' instead of 'authentication'`);
            } else {
              console.log('>>> User document does NOT have an email field!');
              
              // Check all fields that might contain email
              const possibleEmailFields = ['Email', 'userEmail', 'user_email', 'emailAddress', 'primaryEmail', 'mail'];
              let emailFound = false;
              
              for (const field of possibleEmailFields) {
                if (userDoc[field]) {
                  console.log(`>>> Found potential email in field '${field}': ${userDoc[field]}`);
                  console.log(`>>> SOLUTION: Update server.js to check for '${field}' field instead of 'email'`);
                  emailFound = true;
                }
              }
              
              if (!emailFound) {
                console.log('>>> No email fields found in user document. Available fields:');
                console.log(Object.keys(userDoc).join(', '));
              }
            }
          }
        } catch (err) {
          console.error(`Error searching for user in '${collName}':`, err.message);
        }
        
        // Get a sample document to understand the schema
        try {
          const sampleUser = await collection.findOne({});
          console.log(`\nSample document from '${dbName}.${collName}' collection:`);
          console.log(JSON.stringify(sanitizeUserDoc(sampleUser), null, 2));
          
          // Check schema
          console.log(`\nSchema for '${dbName}.${collName}' collection:`);
          console.log(Object.keys(sampleUser).join(', '));
        } catch (err) {
          console.error(`Error fetching sample from '${collName}':`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    if (client) {
      console.log('\nClosing MongoDB connection');
      await client.close();
    }
  }
}

// Run the check
checkDatabase()
  .then(() => console.log('Database check completed'))
  .catch(err => console.error('Unhandled error during database check:', err));
