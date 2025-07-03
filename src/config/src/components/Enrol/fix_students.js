import { MongoClient } from 'mongodb';
const uri = 'mongodb+srv://ronaldbvirinyangwe:Ia4zlauEbL6S5uYh@authentication.mzuydgr.mongodb.net/mydatabase';

async function mergeStudentRecords() {
    const client = new MongoClient(uri);
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected successfully!');
        
        const db = client.db('mydatabase');
        
        // Get all users and students
        const users = await db.collection('users').find().toArray();
        const students = await db.collection('students').find().toArray();
        
        console.log(`Found ${users.length} users and ${students.length} students`);
        
        // Create a map of email to user ID
        const userEmailMap = new Map();
        users.forEach(user => {
            if (user.email) {
                userEmailMap.set(user.email.toLowerCase(), user._id);
            }
        });
        
        // Track changes
        let fixed = 0;
        let skipped = 0;
        let errors = 0;
        
        // Process each student
        for (const student of students) {
            try {
                if (!student.email) {
                    console.log(`Skipping student ${student._id} - no email found`);
                    skipped++;
                    continue;
                }
                
                const studentEmail = student.email.toLowerCase();
                const correctUserId = userEmailMap.get(studentEmail);
                
                if (!correctUserId) {
                    console.log(`No matching user found for student email: ${studentEmail}`);
                    skipped++;
                    continue;
                }
                
                if (student._id.toString() === correctUserId.toString()) {
                    console.log(`Student ${student._id} already has correct ID`);
                    skipped++;
                    continue;
                }
                
                console.log(`\nProcessing student email: ${studentEmail}`);
                console.log(`Current ID: ${student._id}`);
                console.log(`Should be: ${correctUserId}`);
                
                // Create new record with correct ID
                const newStudent = { ...student };
                newStudent._id = correctUserId;
                
                // First delete any existing record with the target ID
                await db.collection('students').deleteOne({ _id: correctUserId });
                
                // Insert the new record
                await db.collection('students').insertOne(newStudent);
                
                // Delete the old record
                await db.collection('students').deleteOne({ _id: student._id });
                
                console.log(`Successfully fixed student record for ${studentEmail}`);
                fixed++;
                
            } catch (err) {
                console.error(`Error processing student ${student.email}:`, err);
                errors++;
            }
        }
        
        console.log('\nSummary:');
        console.log(`Fixed: ${fixed}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await client.close();
        console.log('\nDone!');
    }
}

// Run the function
mergeStudentRecords().catch(console.error);
