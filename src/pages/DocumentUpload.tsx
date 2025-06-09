// src/pages/DocumentUpload.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { coursesAPI, uploadAPI } from "@/lib/api";
import { ArrowLeft, Upload, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface ProcessingStatus {
  processId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  course: Course;
  questionsCount: number;
  topicsCount: number;
  processedAt?: string;
  createdAt: string;
}

const DocumentUpload = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [questionBankFile, setQuestionBankFile] = useState<File | null>(null);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [uploads, setUploads] = useState<ProcessingStatus[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    fetchCourses();
    fetchMyUploads();
  }, [isAuthenticated]);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAllCourses();
      setCourses(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMyUploads = async () => {
    try {
      const response = await uploadAPI.getMyUploads();
      setUploads(response.data);
    } catch (error) {
      console.error("Failed to fetch uploads:", error);
    }
  };

  const handleFileChange = (fileType: 'questionBank' | 'syllabus', file: File | null) => {
    if (file && file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select only PDF files.",
        variant: "destructive",
      });
      return;
    }
    
    if (fileType === 'questionBank') {
      setQuestionBankFile(file);
    } else {
      setSyllabusFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedCourse) {
      toast({
        title: "Missing selection",
        description: "Please select a course.",
        variant: "destructive",
      });
      return;
    }
    
    if (!questionBankFile || !syllabusFile) {
      toast({
        title: "Missing files",
        description: "Please select both question bank and syllabus PDF files.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourse);
      formData.append('questionBank', questionBankFile);
      formData.append('syllabus', syllabusFile);
      
      const response = await uploadAPI.processDocuments(formData);
      
      toast({
        title: "Upload successful",
        description: "Your documents are being processed. This may take several minutes.",
      });
      
      // Start polling for status
      const processId = response.data.processId;
      pollProcessingStatus(processId);
      
      // Clear form
      setSelectedCourse("");
      setQuestionBankFile(null);
      setSyllabusFile(null);
      
      // Refresh uploads list
      fetchMyUploads();
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.response?.data?.message || "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pollProcessingStatus = async (processId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await uploadAPI.getProcessingStatus(processId);
        const status = response.data;
        
        setProcessingStatus(status);
        
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(pollInterval);
          
          if (status.status === 'COMPLETED') {
            toast({
              title: "Processing completed",
              description: `Successfully processed ${status.questionsCount} questions and ${status.topicsCount} topics.`,
            });
          } else {
            toast({
              title: "Processing failed",
              description: "Document processing failed. Please try again.",
              variant: "destructive",
            });
          }
          
          // Refresh uploads list
          fetchMyUploads();
        }
        
      } catch (error) {
        console.error("Status polling error:", error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds
    
    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'PROCESSING':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <NetworkGridBackground>
      <div className="min-h-screen">
        <header className="bg-black/40 backdrop-blur-sm border-b border-cyan-500/20 shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mr-4 text-cyan-100 hover:bg-cyan-900/30 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-white">Document Upload & Processing</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            
            {/* Upload Form */}
            <Card className="shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Upload Question Bank & Syllabus</CardTitle>
                <CardDescription className="text-cyan-100">
                  Upload your question bank and syllabus PDFs to generate processed questions and topics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-100">Select Course</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      {courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>
                          {course.name} ({course.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cyan-100">Question Bank PDF</label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange('questionBank', e.target.files?.[0] || null)}
                      className="bg-black/40 border-cyan-500/30 text-white file:bg-cyan-600 file:text-white file:border-0"
                    />
                    {questionBankFile && (
                      <p className="text-sm text-cyan-200">Selected: {questionBankFile.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cyan-100">Syllabus PDF</label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange('syllabus', e.target.files?.[0] || null)}
                      className="bg-black/40 border-cyan-500/30 text-white file:bg-cyan-600 file:text-white file:border-0"
                    />
                    {syllabusFile && (
                      <p className="text-sm text-cyan-200">Selected: {syllabusFile.name}</p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleUpload}
                  disabled={isUploading || !selectedCourse || !questionBankFile || !syllabusFile}
                  className="w-full bg-cyan-600 hover:bg-cyan-500"
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Process Documents
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Processing Status */}
            {processingStatus && (
              <Card className="shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    {getStatusIcon(processingStatus.status)}
                    <span className="ml-2">Current Processing Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-cyan-100">Course:</span>
                      <span className="text-white">{processingStatus.course.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-100">Status:</span>
                      <span className="text-white">{getStatusText(processingStatus.status)}</span>
                    </div>
                    {processingStatus.status === 'COMPLETED' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-cyan-100">Questions Processed:</span>
                          <span className="text-white">{processingStatus.questionsCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyan-100">Topics Extracted:</span>
                          <span className="text-white">{processingStatus.topicsCount}</span>
                        </div>
                      </>
                    )}
                    {processingStatus.status === 'PROCESSING' && (
                      <Progress value={undefined} className="w-full" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Previous Uploads */}
            <Card className="shadow-xl bg-black/40 backdrop-blur-sm border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Previous Uploads</CardTitle>
                <CardDescription className="text-cyan-100">
                  Your document processing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploads.length > 0 ? (
                  <div className="space-y-3">
                    {uploads.map((upload) => (
                      <div key={upload.processId} className="flex items-center justify-between p-3 bg-black/30 rounded-md border border-cyan-500/20">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(upload.status)}
                          <div>
                            <p className="text-white font-medium">{upload.course.name} ({upload.course.code})</p>
                            <p className="text-sm text-cyan-200">
                              {new Date(upload.createdAt).toLocaleDateString()}
                              {upload.status === 'COMPLETED' && ` • ${upload.questionsCount} questions, ${upload.topicsCount} topics`}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-cyan-100">{getStatusText(upload.status)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-cyan-200">No uploads found</p>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Alert className="bg-black/40 border-cyan-500/30">
              <FileText className="h-4 w-4 text-cyan-400" />
              <AlertDescription className="text-cyan-100">
                <strong>Instructions:</strong>
                <br />
                1. Select the course for which you want to process documents
                <br />
                2. Upload your question bank PDF (contains exam questions)
                <br />
                3. Upload your syllabus PDF (contains course topics and units)
                <br />
                4. Click "Upload & Process Documents" to start AI processing
                <br />
                5. Wait for processing to complete (this may take several minutes)
                <br />
                6. Once completed, you can use the processed data to generate question papers
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    </NetworkGridBackground>
  );
};

export default DocumentUpload;