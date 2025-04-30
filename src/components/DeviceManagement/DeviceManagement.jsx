import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { FaTablet, FaMobile, FaLaptop, FaTrash } from 'react-icons/fa';
import './DeviceManagement.css';

const DeviceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [devices, setDevices] = useState([]);
  const studentId = localStorage.getItem('studentId');
  const BASE_API_URL = 'http://localhost:3001'; 
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    if (!studentId) {
      setError('You must be logged in to manage devices');
      return;
    }

    try {
      const response = await axios.get(`${BASE_API_URL}/students/${studentId}`);
      setDevices(response.data.devices || []);
    } catch (error) {
      setError('Failed to fetch devices');
      console.error(error);
    }
  };

  const generateQrCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${BASE_API_URL}/students/${studentId}/link-device`);
      setQrCode(response.data);
      
      // Set a timer to clear the QR code when it expires
      const expiryTime = new Date(response.data.expiresAt).getTime();
      const currentTime = new Date().getTime();
      const timeoutDuration = expiryTime - currentTime;
      
      if (timeoutDuration > 0) {
        setTimeout(() => {
          setQrCode(null);
        }, timeoutDuration);
      } else {
        setQrCode(null);
        setError('Could not generate QR code. Please try again.');
      }
    } catch (error) {
      setError('Failed to generate QR code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to remove this device?')) {
      return;
    }
    
    try {
      await axios.delete(`${BASE_API_URL}/students/${studentId}/devices/${deviceId}`);
      fetchDevices(); // Refresh the list
    } catch (error) {
      setError('Failed to remove device');
      console.error(error);
    }
  };

  const getDeviceIcon = (device) => {
    const userAgent = device.name.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <FaMobile />;
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return <FaTablet />;
    } else {
      return <FaLaptop />;
    }
  };

  return (
    <div className="device-management-container">
      <h2>Device Management</h2>
      <p>You can use your account on up to 2 devices.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="devices-list">
        <h3>Your Devices ({devices.length}/2)</h3>
        {devices.length === 0 ? (
          <p>No devices connected yet.</p>
        ) : (
          <ul>
            {devices.map((device, index) => (
              <li key={index} className="device-item">
                <div className="device-info">
                  {getDeviceIcon(device)}
                  <div>
                    <span className="device-name">
                      {device.name.split(' ')[0]}
                      {device.isPrimary && <span className="primary-badge">Primary</span>}
                    </span>
                    <span className="device-date">Added: {new Date(device.dateAdded).toLocaleDateString()}</span>
                  </div>
                </div>
                {!device.isPrimary && (
                  <button 
                    className="remove-button"
                    onClick={() => removeDevice(device.id)}
                  >
                    <FaTrash />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {devices.length < 2 ? (
        <div className="qr-section">
          <h3>Add New Device</h3>
          <p>Generate a QR code to link a new device to your account.</p>
          
          {qrCode ? (
            <div className="qr-container">
              <QRCode value={qrCode.linkUrl} size={200} />
              <p>Scan this QR code with your other device.</p>
              <p className="expiry-note">This code will expire in 1 hour at {new Date(qrCode.expiresAt).toLocaleTimeString()}</p>
            </div>
          ) : (
            <button 
              className="generate-button" 
              onClick={generateQrCode}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          )}
        </div>
      ) : (
        <div className="max-devices-message">
          <p>You have reached the maximum number of devices. Remove one to add another.</p>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;