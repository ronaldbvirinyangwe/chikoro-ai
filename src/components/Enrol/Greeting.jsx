import React, { useEffect, useState } from 'react';

const Greeting = () => {
  const [studentName, setStudentName] = useState('');

   useEffect(() => {
    const name = localStorage.getItem('studentName');
    // Check if the name is valid (not undefined, null, or empty string)
    if (name && name !== 'undefined' && name.trim() !== '') {
      setStudentName(name);
    }
  }, []);

  return (
    <div>
      {studentName ? <h1>{studentName}</h1> : <h1>Guest</h1>}
    </div>
  );
};

export default Greeting;