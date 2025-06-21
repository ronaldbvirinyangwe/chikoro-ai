import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar/sidebar';
import Main from './components/Main/Main';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import PaymentPage from './components/PaymentPage/PaymentPage';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Enrol from './components/Enrol/Enrol.jsx';
import SubjectSelect from './components/SubjectSelect/subjectselect.jsx';
import Discover from './components/Discover/discover.jsx';
import Test from './components/Test/test.jsx';
import Exercise from './components/Exercise/exercise.jsx';
import Reports from './components/Reports/reports.jsx';
import MainWindow from './components/MainWindow/mainwindow.jsx';
import LandingPage from './components/LandingPage/LandingPage.jsx';
import PaperSelector from './components/PaperSelector/PaperSelector.jsx'
import Profile from './components/Profile/profile.jsx';
import TeacherDashboard from './components/TeacherDashboard/TeacherDash.jsx'
import QuizGenerator from './components/TeacherDashboard/QuizGenerator.jsx';
import StudentQuiz from './components/TeacherDashboard/StudentQuiz.jsx'
import LessonPlanner from './components/TeacherDashboard/LessonPlanner.jsx';
import ResourceFinder from './components/TeacherDashboard/ResourceFinder.jsx';
import ReportCommentHelper from './components/TeacherDashboard/ReportCommentHelper.jsx';
import SchemeOfWorkCreator from './components/TeacherDashboard/SchemeCreator.jsx';
import TeacherReports from './components/TeacherDashboard/TeacherReports.jsx';
import QuizSubmissions from './components/TeacherDashboard/QuizSubmissions.jsx';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<LandingPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<><Sidebar /><MainWindow /></>} />
            <Route path="/payment" element={<PaymentPage />} />
  <Route path="/enrol" element={<Enrol />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/test" element={<Test />} />
            <Route path="/exercise" element={<Exercise />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/subjectselect" element={<SubjectSelect />} />
<Route path="/papers" element={<PaperSelector />} />
<Route path="/teacher-dashboard" element={< TeacherDashboard />} />
          <Route path="/quiz-generator" element={< QuizGenerator/>} />
          <Route path="/quiz/:quizId" element={<StudentQuiz />} />
          <Route path="/lesson-planner" element={<LessonPlanner />} />
          <Route path="/resource-finder" element={<ResourceFinder />} />
          <Route path="/report-helper" element={<ReportCommentHelper />} />
          <Route path="/scheme-creator" element={<SchemeOfWorkCreator />} />
          <Route path="/teacher/quizzes" element={<TeacherReports />} />
           <Route path="/teacher/quizzes/:quizId/submissions" element={<QuizSubmissions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
