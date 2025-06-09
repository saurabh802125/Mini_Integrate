// server/models/ProcessedData.js - CORRECTED VERSION

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question_id: { type: Number, required: true },
  question: { type: String, required: true },
  predicted_marks: { type: Number, required: true },
  bloom_level: { type: String, required: true },
  difficulty: { type: String, required: true },
  matched_topic: { type: String, required: true },
  matched_unit: { type: String, required: true },
  topic_similarity: { type: Number, required: true }
});

const topicSchema = new mongoose.Schema({
  unit: { type: String, required: true },
  topic_id: { type: Number, required: true },
  topic: { type: String, required: true }
});

const processedDataSchema = new mongoose.Schema({
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Educator',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  questionBankFile: { type: String, required: true },
  syllabusFile: { type: String, required: true },
  questions: [questionSchema],
  topics: [topicSchema],
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const ProcessedData = mongoose.model('ProcessedData', processedDataSchema);

// Export only ProcessedData (removed FileUpload export)
module.exports = ProcessedData;