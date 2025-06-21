import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaBookOpen,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import "./enrol.css";


const BASE_API_URL = "/api/v1";

const Enrol = () => {
  const { darkMode } = useTheme();
  const {
    user,
    isAuthenticated,
    accessToken,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    academicLevel: "",
    curriculum: "",
    grade: "",
    role: "student", 
    school:""
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const checkExistingProfile = async () => {
      if (!isAuthenticated || !user?.email || !accessToken) {
        setIsLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const studentResponse = await axios.get(
          `${BASE_API_URL}/students/by-email/${user.email}`,
          { headers }
        );
        if (studentResponse.data?._id) {
          localStorage.setItem("profileId", studentResponse.data._id);
          localStorage.setItem("userRole", "student");
          navigate("/subjectselect");
          return;
        }
      } catch (studentError) {
        if (studentError.response?.status !== 404) {
          setError("Could not verify your enrollment status. Please refresh.");
          setIsLoading(false);
          return;
        }
        try {
          const teacherResponse = await axios.get(
            `${BASE_API_URL}/teachers/by-email/${user.email}`,
            { headers }
          );
          if (teacherResponse.data?._id) {
            localStorage.setItem("profileId", teacherResponse.data._id);
            localStorage.setItem("userRole", "teacher");
            navigate("/teacher-dashboard");
            return;
          }
        } catch (teacherError) {
          if (teacherError.response?.status !== 404) {
            setError(
              "Could not verify your enrollment status. Please refresh."
            );
            setIsLoading(false);
            return;
          }
          console.log(
            "No existing student or teacher profile found. User can enroll."
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingProfile();
  }, [authLoading, isAuthenticated, user, accessToken, navigate]);

  const handleAcademicLevelChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, academicLevel: value, grade: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!isAuthenticated || !accessToken) {
      setError("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const isStudent = formData.role === "student";
    const endpoint = isStudent
      ? `${BASE_API_URL}/students`
      : `${BASE_API_URL}/teachers`;

    // --- FIX IS HERE ---
    // Prepare payload based on role
    const payload = {
      name: formData.name,
    };

    if (isStudent) {
      payload.age = formData.age;
      payload.academicLevel = formData.academicLevel;
      payload.curriculum = formData.curriculum;
      payload.grade = formData.grade;
    } else {
      // If the user is a teacher, add the school to the payload
      payload.school = formData.school;
    }
    // --- END OF FIX ---

    try {
      // We no longer need to pass role in payload, as the endpoint implies the role.
      const response = await axios.post(endpoint, payload, { headers });
      const newProfile = response.data;

      localStorage.setItem("profileId", newProfile._id);
      localStorage.setItem("userRole", newProfile.role);

      if (newProfile.role === "teacher") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/subjectselect");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setError("A profile for this account already exists. Please log in.");
      } else {
        setError(
          error.response?.data?.error ||
            "Failed to create profile. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submissionMessages = {
    student: [
      "Creating your student profile...",
      "Saving your preferences...",
      "Getting your digital classroom ready...",
      "Just a moment...",
    ],
    teacher: [
      "Setting up your teacher profile...",
      "Preparing your dashboard tools...",
      "Finalizing your account...",
      "Just a moment...",
    ],
  };

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (isSubmitting) {
      const messages = submissionMessages[formData.role];
      const intervalId = setInterval(() => {
        setCurrentMessageIndex(
          (prevIndex) => (prevIndex + 1) % messages.length
        );
      }, 1500);
      return () => clearInterval(intervalId);
    }
  }, [isSubmitting, formData.role]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const gradeOptions = {
    primary: [
      "Grade 1",
      "Grade 2",
      "Grade 3",
      "Grade 4",
      "Grade 5",
      "Grade 6",
      "Grade 7",
    ],
    secondary: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"],
  };

  if (isLoading || isSubmitting) {
    return (
      <div className={`container ${darkMode ? "dark" : ""}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">
            {isSubmitting
              ? submissionMessages[formData.role][currentMessageIndex]
              : "Checking your enrollment status..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${darkMode ? "dark" : ""}`}>
      <div className="form-container">
        <div className="form-header">
          <h1>
            {formData.role === "student" ? (
              <FaUserGraduate />
            ) : (
              <FaChalkboardTeacher />
            )}
            {formData.role === "student"
              ? "Student Registration"
              : "Teacher Registration"}
          </h1>
          <p>Start your journey by creating your profile</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <div className="input-group role-selector">
            <label className="role-label">I am a...</label>
            <div className="role-options">
              <button
                type="button"
                className={`role-btn ${
                  formData.role === "student" ? "active" : ""
                }`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, role: "student" }))
                }
              >
                <FaUserGraduate /> Student
              </button>
              <button
                type="button"
                className={`role-btn ${
                  formData.role === "teacher" ? "active" : ""
                }`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, role: "teacher" }))
                }
              >
                <FaChalkboardTeacher /> Teacher
              </button>
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon">
              <FaUserGraduate />
            </div>
            <div className="input-content">
              <label htmlFor="name">
                {formData.role === "student"
                  ? "Student's Full Name"
                  : "Teacher's Full Name"}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="modern-input"
                placeholder="e.g. Tafara"
              />
            </div>
          </div>

          {formData.role === "teacher" && (
            <div className="input-group">
              <div className="input-icon">
                <FaChalkboardTeacher />
              </div>
              <div className="input-content">
                <label htmlFor="school">Name of School</label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  required
                  className="modern-input"
                  placeholder="e.g. Wisetech College"
                />
              </div>
            </div>
          )}

          {formData.role === "student" && (
            <>
              <div className="input-group">
                <div className="input-icon">
                  <FaCalendarAlt />
                </div>
                <div className="input-content">
                  <label htmlFor="age">Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    required
                    className="modern-input"
                    placeholder=""
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-icon">
                  <FaBookOpen />
                </div>
                <div className="input-content">
                  <label htmlFor="academicLevel">Academic Level</label>
                  <div className="select-wrapper">
                    <select
                      id="academicLevel"
                      name="academicLevel"
                      value={formData.academicLevel}
                      onChange={handleAcademicLevelChange}
                      required
                      className="modern-select"
                    >
                      <option value="">Select Academic Level</option>
                      <option value="primary">Primary School</option>
                      <option value="secondary">Secondary School</option>
                    </select>
                    <FaChevronDown className="select-arrow" />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <div className="input-icon">
                  <FaBookOpen />
                </div>
                <div className="input-content">
                  <label htmlFor="curriculum">Curriculum</label>
                  <div className="select-wrapper">
                    <select
                      id="curriculum"
                      name="curriculum"
                      value={formData.curriculum}
                      onChange={handleInputChange}
                      required
                      className="modern-select"
                    >
                      <option value="">Select Curriculum</option>
                      <option value="zimsec">Zimsec</option>
                      <option value="cambridge">Cambridge</option>
                    </select>
                    <FaChevronDown className="select-arrow" />
                  </div>
                </div>
              </div>

              {formData.academicLevel && (
                <div className="input-group">
                  <div className="input-icon">
                    <FaBookOpen />
                  </div>
                  <div className="input-content">
                    <label htmlFor="grade">Grade/Form</label>
                    <div className="select-wrapper">
                      <select
                        id="grade"
                        name="grade"
                        value={formData.grade}
                        onChange={handleInputChange}
                        required
                        className="modern-select"
                      >
                        <option value="">Select Grade/Form</option>
                        {gradeOptions[formData.academicLevel]?.map(
                          (grade, index) => (
                            <option key={index} value={grade}>
                              {grade}
                            </option>
                          )
                        )}
                      </select>
                      <FaChevronDown className="select-arrow" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" className="submit-btn" disabled={authLoading}>
            Continue <FaChevronRight />
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Enrol;