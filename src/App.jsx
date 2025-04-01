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

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<LandingPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<><Sidebar /><MainWindow /></>} />
            <Route path="/payment" element={<PaymentPage />} />
  <Route path="/enrol" element={<Enrol />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/test" element={<Test />} />
            <Route path="/exercise" element={<Exercise />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/subjectselect" element={<SubjectSelect />} />
<Route path="/papers" element={<PaperSelector />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
