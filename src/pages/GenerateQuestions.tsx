// src/pages/GenerateQuestions.tsx - Enhanced with processed data integration
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Loader2, Database, Bot, BarChart3 } from "lucide-react";
import { questionAPI, uploadAPI } from "@/lib/api";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface QuestionConfig {
  questionId: string;
  level: string;
  marks: number;
  includeC: boolean;
  co?: number;
}

interface ProcessedQuestion {
  questionId: string;
  text: string;
  marks: number;
  difficulty: string;
  bloomLevel: string;
  unit: string;
  topic: string;
  co?: number;
  source: 'processed_data' | 'ai_generated';
}

interface QuestionStats {
  totalQuestions: number;
  totalTopics: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  bloomLevelDistribution: Record<string, number>;
  marksDistribution: Record<string, number>;
  unitDistribution: Record<string, number>;
}

const GenerateQuestions = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [generatedQuestions, setGeneratedQuestions] = useState<ProcessedQuestion[]>([]);
  const [questionPaperText, setQuestionPaperText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasProcessedData, setHasProcessedData] = useState<boolean>(false);
  const [useProcessedData, setUseProcessedData] = useState<boolean>(true);
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null);
  const [examData, setExamData] = useState<{
    examConfig: { examType: string; semester: string; course: string };
    questionConfigs: QuestionConfig[];
    numQuestions: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    const state = location.state as {
      examConfig: { examType: string; semester: string; course: string };
      questionConfigs: QuestionConfig[];
      numQuestions: number;
    } | null;
    
    if (!state) {
      toast({
        title: "Error",
        description: "No exam configuration provided",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setExamData(state);
    checkProcessedData(state.examConfig.course);
  }, [isAuthenticated, location.state, navigate, toast]);

  const checkProcessedData = async (courseCode: string) => {
    try {
      // Find course ID from course code
      // This would need to be implemented based on your course selection logic
      const courseId = courseCode; // Assuming courseCode is actually courseId
      
      const response = await uploadAPI.getProcessedData(courseId);
      if (response.data && response.data.questions.length > 0) {
        setHasProcessedData(true);
        
        // Get statistics
        const statsResponse = await questionAPI.getQuestionStats(courseId);
        setQuestionStats(statsResponse.data);
        
        toast({
          title: "Processed data available",
          description: `Found ${response.data.questions.length} processed questions for this course`,
        });
      } else {
        setHasProcessedData(false);
        setUseProcessedData(false);
      }
    } catch (error) {
      console.error("Error checking processed data:", error);
      setHasProcessedData(false);
      setUseProcessedData(false);
    }
  };

  const generateQuestionsWithAPI = async (data: {
    examConfig: { examType: string; semester: string; course: string };
    questionConfigs: QuestionConfig[];
    numQuestions: number;
  }) => {
    setIsGenerating(true);
    
    try {
      const response = await questionAPI.generateQuestions({
        courseId: data.examConfig.course,
        examType: data.examConfig.examType,
        questionConfigs: data.questionConfigs,
        useProcessedData: useProcessedData
      });
      
      const { questions, source } = response.data;
      setGeneratedQuestions(questions);
      
      // Generate formatted question paper
      const formattedPaper = formatQuestionPaper(data.examConfig, questions);
      setQuestionPaperText(formattedPaper);
      
      toast({
        title: "Questions Generated",
        description: `Generated ${questions.length} questions using ${source === 'processed_data' ? 'processed data' : 'AI generation'}`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.response?.data?.message || "There was an error generating questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatQuestionPaper = (examConfig: any, questions: ProcessedQuestion[]) => {
    const courseMap: Record<string, string> = {
      "ML": "Machine Learning",
      "ACN": "Advanced Computer Networks",
      "DCN": "Data Communication Networks", 
      "DL": "Deep Learning",
      "DS": "Data Structures",
      "DBMS": "Database Management Systems",
      "AI": "Artificial Intelligence",
      "OS": "Operating Systems"
    };
    
    const courseName = courseMap[examConfig.course] || examConfig.course;
    
    let questionPaper = "";
    
    // Add header
    questionPaper += `${examConfig.examType === "CIE" ? "CONTINUOUS INTERNAL EVALUATION" : "SEMESTER END EXAMINATION"}\n`;
    questionPaper += `SEMESTER: ${examConfig.semester}\n`;
    questionPaper += `COURSE: ${courseName} (${examConfig.course})\n\n`;
    
    if (examConfig.examType === "CIE") {
      // CIE format
      questionPaper += "Answer all questions. Each section carries 15 marks.\n\n";
      
      const sections = [1, 2, 3];
      
      for (const section of sections) {
        questionPaper += `SECTION ${section}:\n\n`;
        
        const sectionQuestions = questions.filter(q => 
          q.questionId.startsWith(section.toString())
        );
        
        for (const question of sectionQuestions) {
          const questionPart = question.questionId[1]; 
          questionPaper += `${section}${questionPart.toUpperCase()}. ${question.text} [${question.marks} Marks]\n`;
          questionPaper += `    Topic: ${question.topic} | Difficulty: ${question.difficulty} | Bloom Level: ${question.bloomLevel}\n\n`;
        }
        
        questionPaper += "\n";
      }
    } else {
      // Semester End format
      questionPaper += "Answer one full question from each module. Each module carries 20 marks.\n\n";
      
      const cos = [1, 2, 3, 4, 5];
      
      for (const co of cos) {
        questionPaper += `MODULE ${co} (CO${co}):\n\n`;
        
        for (let setIdx = 1; setIdx <= 2; setIdx++) {
          const questionNum = (co - 1) * 2 + setIdx;
          
          const questionSet = questions.filter(q => 
            parseInt(q.questionId) === questionNum
          );
          
          questionPaper += `Question ${questionNum}:\n`;
          
          for (const question of questionSet) {
            const questionPart = question.questionId.slice(-1);
            questionPaper += `${questionNum}${questionPart.toUpperCase()}. ${question.text} [${question.marks} Marks]\n`;
            questionPaper += `    Topic: ${question.topic} | Difficulty: ${question.difficulty} | Bloom Level: ${question.bloomLevel}\n\n`;
          }
          
          questionPaper += "\n";
        }
      }
    }
    
    return questionPaper;
  };

  const handleDownload = () => {
    if (!questionPaperText) return;
    
    const blob = new Blob([questionPaperText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `${examData?.examConfig.examType}_${examData?.examConfig.course}_question_paper.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your question paper is being downloaded.",
    });
  };

  const handleRegenerateQuestions = () => {
    if (examData) {
      generateQuestionsWithAPI(examData);
    }
  };

  const goBack = () => {
    const backRoute = examData?.examConfig.examType === "CIE" 
      ? "/cie-exam-setup" 
      : "/semester-exam-setup";
      
    navigate(backRoute, { state: examData?.examConfig });
  };

  if (!examData) {
    return <div>Loading...</div>;
  }

  return (
    <NetworkGridBackground>
      <div className="min-h-screen">
        <header className="bg-black/40 backdrop-blur-sm border-b border-cyan-500/20 shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
            <Button variant="ghost" size="sm" onClick={goBack} className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">AI Question Generation</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">

            {/* Data Source Selection */}
            <Card className="bg-black/40 backdrop-blur-sm border-cyan-400/30 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white">Question Generation Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-4">
                    <Badge variant={hasProcessedData ? "default" : "secondary"} className="flex items-center">
                      <Database className="h-3 w-3 mr-1" />
                      Processed Data: {hasProcessedData ? "Available" : "Not Available"}
                    </Badge>
                    <Badge variant="outline" className="flex items-center text-white border-white/30">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Generation: Always Available
                    </Badge>
                  </div>
                  
                  {hasProcessedData && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useProcessedData"
                        checked={useProcessedData}
                        onChange={(e) => setUseProcessedData(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="useProcessedData" className="text-cyan-100">
                        Use processed question bank data when available
                      </label>
                    </div>
                  )}
                  
                  {!hasProcessedData && (
                    <Alert className="bg-yellow-900/20 border-yellow-500/30">
                      <AlertDescription className="text-yellow-100">
                        No processed data found for this course. Questions will be generated using AI.
                        To use processed data, please upload your question bank and syllabus first.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generation Controls */}
            <Card className="bg-black/40 backdrop-blur-sm border-cyan-400/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-white">
                  <span>Question Paper Generation</span>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRegenerateQuestions}
                      disabled={isGenerating}
                      className="text-cyan-100 hover:bg-cyan-900/30 hover:text-white border-cyan-500/30"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Questions"
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownload}
                      disabled={!questionPaperText || isGenerating}
                      className="text-cyan-100 hover:bg-cyan-900/30 hover:text-white border-cyan-500/30"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!questionPaperText && !isGenerating && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto text-cyan-400 mb-4" />
                    <p className="text-cyan-100 mb-4">Ready to generate questions based on your configuration</p>
                    <Button 
                      onClick={() => examData && generateQuestionsWithAPI(examData)}
                      className="bg-cyan-600 hover:bg-cyan-500"
                    >
                      Start Generation
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-12 text-white">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
                    <p className="text-lg font-medium">Generating questions...</p>
                    <p className="text-sm text-cyan-200/70">
                      {useProcessedData && hasProcessedData 
                        ? "Using your processed question bank data for intelligent question selection"
                        : "Creating questions using AI based on your specifications"
                      }
                    </p>
                  </div>
                )}

                {questionPaperText && !isGenerating && (
                  <Tabs defaultValue="paper" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="paper">Question Paper</TabsTrigger>
                      <TabsTrigger value="questions">Question Details</TabsTrigger>
                      {questionStats && <TabsTrigger value="stats">Statistics</TabsTrigger>}
                    </TabsList>
                    
                    <TabsContent value="paper" className="mt-4">
                      <Textarea 
                        value={questionPaperText} 
                        onChange={(e) => setQuestionPaperText(e.target.value)}
                        className="font-mono min-h-[60vh] text-sm bg-black/40 border-cyan-500/30 text-white"
                        placeholder="Generated question paper will appear here..."
                      />
                    </TabsContent>
                    
                    <TabsContent value="questions" className="mt-4">
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {generatedQuestions.map((question, index) => (
                          <Card key={index} className="bg-black/20 border-cyan-500/20">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant={question.source === 'processed_data' ? 'default' : 'secondary'}>
                                  {question.source === 'processed_data' ? 'From Question Bank' : 'AI Generated'}
                                </Badge>
                                <Badge variant="outline" className="text-white border-white/30">
                                  {question.marks} marks
                                </Badge>
                              </div>
                              <p className="text-white mb-2">{question.text}</p>
                              <div className="flex flex-wrap gap-2 text-sm">
                                <span className="text-cyan-200">Topic: {question.topic}</span>
                                <span className="text-cyan-200">•</span>
                                <span className="text-cyan-200">Difficulty: {question.difficulty}</span>
                                <span className="text-cyan-200">•</span>
                                <span className="text-cyan-200">Bloom: {question.bloomLevel}</span>
                                <span className="text-cyan-200">•</span>
                                <span className="text-cyan-200">Unit: {question.unit}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {questionStats && (
                      <TabsContent value="stats" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Card className="bg-black/20 border-cyan-500/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-cyan-200">Total Questions</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold text-white">{questionStats.totalQuestions}</p>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-black/20 border-cyan-500/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-cyan-200">Total Topics</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold text-white">{questionStats.totalTopics}</p>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-black/20 border-cyan-500/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-cyan-200">Difficulty Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-cyan-100">Easy:</span>
                                <span className="text-white">{questionStats.difficultyDistribution.easy}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-cyan-100">Medium:</span>
                                <span className="text-white">{questionStats.difficultyDistribution.medium}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-cyan-100">Hard:</span>
                                <span className="text-white">{questionStats.difficultyDistribution.hard}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </NetworkGridBackground>
  );
};

export default GenerateQuestions;