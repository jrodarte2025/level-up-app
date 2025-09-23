import React, { useState } from 'react';
import { testNotificationSetup, requestNotificationPermission } from '../utils/notificationTest';

export function NotificationTestButton({ style = {} }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setShowResults(true);
    
    console.log("🔔 Running notification test...");
    const testResults = await testNotificationSetup();
    setResults(testResults);
    
    // If permission is needed, request it
    if (testResults.permission === "default") {
      const confirmRequest = window.confirm(
        "Notifications are not enabled. Would you like to enable them now?"
      );
      
      if (confirmRequest) {
        const permResults = await requestNotificationPermission();
        setResults(permResults);
      }
    }
    
    setTesting(false);
  };

  const getStatusIcon = () => {
    if (!results) return "🔔";
    if (results.overall) return "✅";
    if (results.permission === "denied") return "🚫";
    return "⚠️";
  };

  const getStatusText = () => {
    if (!results) return "Test Notifications";
    if (results.overall) return "Notifications Working!";
    if (results.permission === "denied") return "Notifications Blocked";
    if (results.permission === "default") return "Permission Needed";
    return "Setup Issues";
  };

  return (
    <>
      <button
        onClick={runTest}
        disabled={testing}
        style={{
          padding: "8px 16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          backgroundColor: results?.overall ? "#4CAF50" : "#f0f0f0",
          color: results?.overall ? "white" : "black",
          cursor: testing ? "wait" : "pointer",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          ...style
        }}
      >
        <span>{getStatusIcon()}</span>
        <span>{testing ? "Testing..." : getStatusText()}</span>
      </button>

      {showResults && results && (
        <div style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "#f9f9f9",
          borderRadius: "6px",
          border: "1px solid #ddd",
          fontSize: "12px",
          lineHeight: "1.5"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            Test Results:
          </div>
          <div>Browser: {results.browser}</div>
          <div>Permission: {results.permission}</div>
          <div>Service Worker: {results.serviceWorker}</div>
          <div>Token: {results.token ? 
            (typeof results.token === 'string' ? '✅ Generated' : results.token) : 
            '❌ Not generated'}</div>
          <div>Storage: {results.storage || 'Not checked'}</div>
          
          {!results.overall && (
            <div style={{ 
              marginTop: "10px", 
              padding: "5px", 
              backgroundColor: "#fff3cd",
              borderRadius: "4px"
            }}>
              {results.permission === "denied" ? (
                <div>⚠️ Enable notifications in browser settings</div>
              ) : results.permission === "default" ? (
                <div>⚠️ Click the button again to request permission</div>
              ) : (
                <div>⚠️ Check browser console for details</div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}