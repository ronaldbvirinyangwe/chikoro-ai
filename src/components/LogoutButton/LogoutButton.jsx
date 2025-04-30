import React from 'react';

const LogoutButton = () => {
  const handleLogout = () => {
    // Remove the token from local storage
    localStorage.removeItem("token");
    // Redirect to the login page
    navigate("/login");
  };


  return (
    <button className='logout'onClick={handleLogout}>
      Logout
    </button>
  );
};

export default LogoutButton;