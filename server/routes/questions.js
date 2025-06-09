// server/routes/questions.js - Enhanced with processed data integration
const express = require('express');
const { check, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const { ProcessedData } = require('../models/ProcessedData');
const auth = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/questions/generate
// @desc    Generate questions using processed data or AI
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const { courseId, examType, questionConfigs, useProcessedData = true } = req.body;
    
    if (!courseId || !examType || !questionConfigs) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    let generatedQuestions = [];
    
    if (useProcessedData) {
      // Try to use processed data first
      const processedData = await ProcessedData.findOne({
        educator: req.educator._id,
        course: courseId,
        processingStatus: 'COMPLETED'
      });
      
      if (processedData && processedData.questions.length > 0) {
        generatedQuestions = generateFromProcessedData(
          processedData, 
          examType, 
          questionConfigs
        );
      } else {
        // Fallback to AI generation if no processed data
        generatedQuestions = generateWithAI(courseId, examType, questionConfigs);
      }
    } else {
      // Use AI generation directly
      generatedQuestions = generateWithAI(courseId, examType, questionConfigs);
    }
    
    res.json({
      questions: generatedQuestions,
      source: useProcessedData && generatedQuestions.length > 0 ? 'processed_data' : 'ai_generated',
      totalQuestions: generatedQuestions.length
    });
    
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
});

// Function to generate questions from processed data
function generateFromProcessedData(processedData, examType, questionConfigs) {
  const { questions, topics } = processedData;
  const generatedQuestions = [];
  
  if (examType === 'CIE') {
    // Generate CIE questions (3 sections)
    const sections = [1, 2, 3];
    
    for (const section of sections) {
      const sectionConfigs = questionConfigs.filter(q => 
        q.questionId.startsWith(section.toString())
      );
      
      for (const config of sectionConfigs) {
        // Skip 'c' parts that are not included
        if (config.questionId.endsWith('c') && !config.includeC) {
          continue;
        }
        
        // Find matching questions from processed data
        const matchingQuestions = questions.filter(q => {
          const difficultyMatch = q.difficulty.toLowerCase() === config.level.toLowerCase();
          const marksMatch = Math.abs(q.predicted_marks - config.marks) <= 1;
          const unitMatch = q.matched_unit.includes(`Unit ${section}`);
          
          return difficultyMatch && marksMatch && unitMatch;
        });
        
        if (matchingQuestions.length > 0) {
          // Select random question from matches
          const selectedQuestion = matchingQuestions[
            Math.floor(Math.random() * matchingQuestions.length)
          ];
          
          generatedQuestions.push({
            questionId: config.questionId,
            text: selectedQuestion.question,
            marks: config.marks,
            difficulty: config.level,
            bloomLevel: selectedQuestion.bloom_level,
            unit: selectedQuestion.matched_unit,
            topic: selectedQuestion.matched_topic,
            source: 'processed_data'
          });
        } else {
          // Generate AI question if no match found
          const aiQuestion = generateAIQuestionForConfig(config, section);
          generatedQuestions.push(aiQuestion);
        }
      }
    }
  } else {
    // Generate Semester End questions (5 COs, 2 questions each)
    const cos = [1, 2, 3, 4, 5];
    
    for (const co of cos) {
      for (let setIdx = 1; setIdx <= 2; setIdx++) {
        const questionNum = (co - 1) * 2 + setIdx;
        const questionSet = questionConfigs.filter(q => 
          parseInt(q.questionId) === questionNum
        );
        
        for (const config of questionSet) {
          // Skip 'c' parts that are not included
          if (config.questionId.endsWith('c') && !config.includeC) {
            continue;
          }
          
          // Find matching questions for this CO
          const matchingQuestions = questions.filter(q => {
            const difficultyMatch = q.difficulty.toLowerCase() === config.level.toLowerCase();
            const marksMatch = Math.abs(q.predicted_marks - config.marks) <= 2;
            
            return difficultyMatch && marksMatch;
          });
          
          if (matchingQuestions.length > 0) {
            const selectedQuestion = matchingQuestions[
              Math.floor(Math.random() * matchingQuestions.length)
            ];
            
            generatedQuestions.push({
              questionId: config.questionId,
              text: selectedQuestion.question,
              marks: config.marks,
              difficulty: config.level,
              bloomLevel: selectedQuestion.bloom_level,
              unit: selectedQuestion.matched_unit,
              topic: selectedQuestion.matched_topic,
              co: co,
              source: 'processed_data'
            });
          } else {
            // Generate AI question if no match found
            const aiQuestion = generateAIQuestionForConfig(config, null, co);
            generatedQuestions.push(aiQuestion);
          }
        }
      }
    }
  }
  
  return generatedQuestions;
}

// Function to generate AI questions when processed data is not available
function generateWithAI(courseId, examType, questionConfigs) {
  const generatedQuestions = [];
  
  if (examType === 'CIE') {
    const sections = [1, 2, 3];
    
    for (const section of sections) {
      const sectionConfigs = questionConfigs.filter(q => 
        q.questionId.startsWith(section.toString())
      );
      
      for (const config of sectionConfigs) {
        if (config.questionId.endsWith('c') && !config.includeC) {
          continue;
        }
        
        const aiQuestion = generateAIQuestionForConfig(config, section);
        generatedQuestions.push(aiQuestion);
      }
    }
  } else {
    const cos = [1, 2, 3, 4, 5];
    
    for (const co of cos) {
      for (let setIdx = 1; setIdx <= 2; setIdx++) {
        const questionNum = (co - 1) * 2 + setIdx;
        const questionSet = questionConfigs.filter(q => 
          parseInt(q.questionId) === questionNum
        );
        
        for (const config of questionSet) {
          if (config.questionId.endsWith('c') && !config.includeC) {
            continue;
          }
          
          const aiQuestion = generateAIQuestionForConfig(config, null, co);
          generatedQuestions.push(aiQuestion);
        }
      }
    }
  }
  
  return generatedQuestions;
}

// Helper function to generate AI question for specific config
function generateAIQuestionForConfig(config, section = null, co = null) {
  // This would be replaced with actual AI generation
  const topics = [
    "data structures", "algorithms", "database design", "network protocols",
    "machine learning", "software engineering", "computer architecture",
    "operating systems", "programming concepts", "web development"
  ];
  
  const seed = config.questionId.length + config.marks + (co || section || 0);
  const topic = topics[seed % topics.length];
  
  const questionTemplates = {
    "easy": [
      `Define and explain ${topic} with suitable examples.`,
      `List the key characteristics and features of ${topic}.`,
      `Draw a diagram to illustrate the concept of ${topic}.`,
      `What are the basic components and elements of ${topic}?`
    ],
    "medium": [
      `Explain the working principle of ${topic} with detailed examples and applications.`,
      `Analyze the advantages and disadvantages of ${topic} in practical scenarios.`,
      `Describe the implementation process of ${topic} with algorithmic steps.`,
      `Compare and contrast ${topic} with other related concepts in detail.`
    ],
    "hard": [
      `Design and implement a comprehensive solution using ${topic} for complex real-world problems.`,
      `Critically evaluate the performance and efficiency of ${topic} under various constraints.`,
      `Develop an optimized approach for ${topic} and justify your design decisions.`,
      `Create a novel algorithm or system incorporating ${topic} to solve industry challenges.`
    ]
  };
  
  const templates = questionTemplates[config.level] || questionTemplates["medium"];
  const questionText = templates[seed % templates.length];
  
  return {
    questionId: config.questionId,
    text: questionText,
    marks: config.marks,
    difficulty: config.level,
    bloomLevel: config.level === 'easy' ? 'L1' : config.level === 'medium' ? 'L3' : 'L5',
    unit: section ? `Unit ${section}` : 'General',
    topic: topic,
    co: co,
    source: 'ai_generated'
  };
}

// @route   POST /api/questions/filter
// @desc    Filter questions from processed data
// @access  Private
router.post('/filter', auth, async (req, res) => {
  try {
    const { courseId, difficulty, bloomLevel, unit, marks } = req.body;
    
    const processedData = await ProcessedData.findOne({
      educator: req.educator._id,
      course: courseId,
      processingStatus: 'COMPLETED'
    });
    
    if (!processedData) {
      return res.status(404).json({ message: 'No processed data found for this course' });
    }
    
    let filteredQuestions = processedData.questions;
    
    // Apply filters
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }
    
    if (bloomLevel) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.bloom_level === bloomLevel
      );
    }
    
    if (unit) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.matched_unit.toLowerCase().includes(unit.toLowerCase())
      );
    }
    
    if (marks) {
      filteredQuestions = filteredQuestions.filter(q => 
        Math.abs(q.predicted_marks - marks) <= 1
      );
    }
    
    res.json({
      questions: filteredQuestions,
      totalCount: filteredQuestions.length,
      filters: { difficulty, bloomLevel, unit, marks }
    });
    
  } catch (error) {
    console.error('Question filtering error:', error);
    res.status(500).json({ message: 'Failed to filter questions' });
  }
});

// @route   GET /api/questions/stats/:courseId
// @desc    Get statistics about processed questions
// @access  Private
router.get('/stats/:courseId', auth, async (req, res) => {
  try {
    const processedData = await ProcessedData.findOne({
      educator: req.educator._id,
      course: req.params.courseId,
      processingStatus: 'COMPLETED'
    });
    
    if (!processedData) {
      return res.status(404).json({ message: 'No processed data found for this course' });
    }
    
    const questions = processedData.questions;
    const topics = processedData.topics;
    
    // Calculate statistics
    const stats = {
      totalQuestions: questions.length,
      totalTopics: topics.length,
      difficultyDistribution: {
        easy: questions.filter(q => q.difficulty === 'Easy').length,
        medium: questions.filter(q => q.difficulty === 'Medium').length,
        hard: questions.filter(q => q.difficulty === 'Hard').length
      },
      bloomLevelDistribution: {},
      marksDistribution: {},
      unitDistribution: {}
    };
    
    // Bloom level distribution
    const bloomLevels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    bloomLevels.forEach(level => {
      stats.bloomLevelDistribution[level] = questions.filter(q => q.bloom_level === level).length;
    });
    
    // Marks distribution
    const marksRanges = ['1-3', '4-6', '7-10', '11+'];
    stats.marksDistribution = {
      '1-3': questions.filter(q => q.predicted_marks >= 1 && q.predicted_marks <= 3).length,
      '4-6': questions.filter(q => q.predicted_marks >= 4 && q.predicted_marks <= 6).length,
      '7-10': questions.filter(q => q.predicted_marks >= 7 && q.predicted_marks <= 10).length,
      '11+': questions.filter(q => q.predicted_marks > 10).length
    };
    
    // Unit distribution
    const units = [...new Set(topics.map(t => t.unit))];
    units.forEach(unit => {
      stats.unitDistribution[unit] = questions.filter(q => q.matched_unit === unit).length;
    });
    
    res.json(stats);
    
  } catch (error) {
    console.error('Stats generation error:', error);
    res.status(500).json({ message: 'Failed to generate statistics' });
  }
});

module.exports = router;