// src/pages/Dashboard.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { coursesAPI, examsAPI } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, BookOpen, AlarmClock, FileText, PenLine, Pencil, LogOut } from "lucide-react";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface Exam {
  _id: string;
  examType: string;
  semester: string;
  course: Course;
  createdAt: string;
}

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch courses
        const coursesResponse = await coursesAPI.getAllCourses();
        setCourses(coursesResponse.data);

        // Fetch exams
        const examsResponse = await examsAPI.getEducatorExams();
        setExams(examsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load your data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const handleCreateExam = () => {
    // Navigate to the exam type selection page
    navigate("/exam-type-selection");
  };

  if (isLoading) {
    return (
      <NetworkGridBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-black/40 backdrop-blur-sm p-8 rounded-lg border border-cyan-500/30">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <span className="mt-4 block text-white text-center">Loading...</span>
          </div>
        </div>
      </NetworkGridBackground>
    );
  }

  return (
    <NetworkGridBackground>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between backdrop-blur-sm bg-black/40 p-4 rounded-lg border border-cyan-500/20">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-cyan-200">Welcome back, {currentUser?.name}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="mt-4 md:mt-0 bg-transparent border-cyan-500/50 text-cyan-100 hover:bg-cyan-900/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          <Separator className="bg-cyan-500/20" />

          {/* Create new exam card */}
          <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <PenLine className="mr-2 h-5 w-5 text-cyan-400" />
                Create New Exam
              </CardTitle>
              <CardDescription className="text-cyan-200">Start creating a new examination paper</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-cyan-100 mb-4">
                Choose between Continuous Internal Evaluation (CIE) or Semester End Examination (SEE)
                to generate a customized question paper for your course.
              </p>
              <Button onClick={handleCreateExam} className="w-full bg-cyan-600 hover:bg-cyan-500">
                Create New Exam
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <BookOpen className="mr-2 h-5 w-5 text-cyan-400" />
                  My Courses
                </CardTitle>
                <CardDescription className="text-cyan-200">Courses you're teaching</CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser?.courses?.length > 0 ? (
                  <ul className="space-y-2">
                    {currentUser.courses.map((courseId: string) => {
                      const course = courses.find(c => c._id === courseId);
                      return (
                        <li key={courseId} className="p-2 bg-black/30 rounded-md border border-cyan-500/20 text-white">
                          {course ? `${course.name} (${course.code})` : 'Unknown course'}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-cyan-200">No courses assigned yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <AlarmClock className="mr-2 h-5 w-5 text-cyan-400" />
                  Recent Exams
                </CardTitle>
                <CardDescription className="text-cyan-200">Your recently created exams</CardDescription>
              </CardHeader>
              <CardContent>
                {exams.length > 0 ? (
                  <ul className="space-y-2">
                    {exams.slice(0, 3).map((exam) => (
                      <li key={exam._id} className="p-2 bg-black/30 rounded-md border border-cyan-500/20">
                        <div className="font-medium text-white">{exam.examType} - {exam.course.code}</div>
                        <div className="text-sm text-cyan-200">Semester: {exam.semester}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-cyan-200">No exams created yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <FileText className="mr-2 h-5 w-5 text-cyan-400" />
                  Generate Questions
                </CardTitle>
                <CardDescription className="text-cyan-200">Use AI to create exam questions</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-cyan-100">
                  Generate exam questions for your courses using our AI-powered tool.
                  Questions are tailored to your course material and exam requirements.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-cyan-600 hover:bg-cyan-500" 
                  onClick={() => navigate("/generate-questions")}
                >
                  Generate Questions
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-8">
            <Card className="bg-black/40 border-cyan-400/30 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-white">Your Information</CardTitle>
                <CardDescription className="text-cyan-200">Your educator profile details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-cyan-300">Full Name</h3>
                      <p className="text-white">{currentUser?.name || 'Not available'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-cyan-300">Email</h3>
                      <p className="text-white">{currentUser?.email || 'Not available'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-cyan-300">Department</h3>
                      <p className="text-white">{currentUser?.department || 'Not available'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-cyan-300">Semester</h3>
                      <p className="text-white">{currentUser?.semester || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default Dashboard;