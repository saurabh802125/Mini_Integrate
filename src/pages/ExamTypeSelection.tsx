import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coursesAPI } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2 } from "lucide-react";
import NetworkGridBackground from "@/components/NetworkGridBackground";

interface Course {
  _id: string;
  name: string;
  code: string;
}

const ExamTypeSelection = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [examType, setExamType] = useState<string>("");
  const [semester, setSemester] = useState<string>(currentUser?.semester || "");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await coursesAPI.getAllCourses();
      
      // Filter courses based on currentUser's courses if available
      let availableCourses = response.data;
      if (currentUser?.courses && currentUser.courses.length > 0) {
        availableCourses = response.data.filter((course: Course) => 
          currentUser.courses.includes(course._id)
        );
      }
      
      setCourses(availableCourses);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch courses when component mounts
  useEffect(() => {
    fetchCourses();
  }, []);

  const handleContinue = () => {
    if (!examType) {
      toast({
        title: "Missing Selection",
        description: "Please select an exam type to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!semester) {
      toast({
        title: "Missing Selection",
        description: "Please select a semester to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Missing Selection",
        description: "Please select a course to continue.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to document upload page with exam configuration
    navigate("/upload-documents", {
      state: {
        examType,
        semester,
        course: selectedCourse,
      },
    });
  };

  return (
    <NetworkGridBackground>
      <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="w-full max-w-3xl">
          <Card className="shadow-xl backdrop-blur-sm bg-black/30 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Select Exam Type</CardTitle>
              <CardDescription className="text-cyan-100">Configure the type of exam you want to create</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">Exam Type</label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="CIE">Continuous Internal Evaluation (CIE)</SelectItem>
                    <SelectItem value="SEE">Semester End Examination (SEE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">Semester</label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                    <SelectItem value="3">Semester 3</SelectItem>
                    <SelectItem value="4">Semester 4</SelectItem>
                    <SelectItem value="5">Semester 5</SelectItem>
                    <SelectItem value="6">Semester 6</SelectItem>
                    <SelectItem value="7">Semester 7</SelectItem>
                    <SelectItem value="8">Semester 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-100">Course</label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 p-2 text-cyan-100">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Loading courses...</span>
                  </div>
                ) : (
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      {courses.length > 0 ? (
                        courses.map((course) => (
                          <SelectItem key={course._id} value={course.code}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No courses available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleContinue} 
                disabled={!examType || !semester || !selectedCourse}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </NetworkGridBackground>
  );
};

export default ExamTypeSelection;