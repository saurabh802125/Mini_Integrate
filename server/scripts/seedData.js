
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Course = require('../models/Course');
const Educator = require('../models/Educator');

// Sample data
const courses = [
  {
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    department: 'Computer Science',
    credits: 4,
    description: 'Fundamentals of data structures and algorithms design and analysis.'
  },
  {
    name: 'Database Management Systems',
    code: 'CS301',
    department: 'Computer Science',
    credits: 3,
    description: 'Introduction to database concepts, design, and implementation.'
  },
  {
    name: 'Artificial Intelligence',
    code: 'CS401',
    department: 'Computer Science',
    credits: 4,
    description: 'Foundations of AI including search, knowledge representation, and machine learning.'
  },
  {
    name: 'Linear Algebra',
    code: 'MATH201',
    department: 'Mathematics',
    credits: 3,
    description: 'Vector spaces, linear transformations, matrices, and determinants.'
  },
  {
    name: 'Digital Electronics',
    code: 'ECE201',
    department: 'Electronics',
    credits: 4,
    description: 'Introduction to digital systems, combinational and sequential circuits.'
  }
];
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await Course.deleteMany(); // Clear previous courses
    await Course.insertMany(courses);
    console.log("✅ Courses Seeded Successfully");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    mongoose.connection.close();
  });





