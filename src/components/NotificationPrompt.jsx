import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

export default function NotificationPrompt({ onClose, onEnable }) {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  // Detect if PWA is installed
  const isPWAInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  };

  // Detect iOS Safari
  const isIOSSafari = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           !window.MSStream &&
           /Safari/i.test(navigator.userAgent);
  };

  // Check if notifications are already enabled
  const notificationsEnabled = typeof Notification !== 'undefined' && 
                               Notification.permission === 'granted';

  // Show prompt conditions
  const shouldShow = typeof Notification !== 'undefined' && 
                     !notificationsEnabled && 
                     (!isIOSSafari() || isPWAInstalled());

  const shouldShowInstallGuide = isIOSSafari() && !isPWAInstalled();

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleEnable = async () => {
    try {
      await onEnable();
      handleClose();
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  if (notificationsEnabled) {
    return null; // Don't show if already enabled
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        padding: '1rem'
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '420px',
          width: '100%',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.3s ease-in-out',
          color: theme.palette.text.primary
        }}
      >
        <IconButton
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            color: theme.palette.text.secondary
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {shouldShowInstallGuide ? (
            <InstallMobileIcon 
              style={{ 
                fontSize: '3rem', 
                color: theme.palette.primary.main,
                marginBottom: '1rem'
              }} 
            />
          ) : (
            <NotificationsIcon 
              style={{ 
                fontSize: '3rem', 
                color: theme.palette.primary.main,
                marginBottom: '1rem'
              }} 
            />
          )}
          
          <h2 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme.palette.text.primary
          }}>
            Stay Connected!
          </h2>
          
          <p style={{ 
            margin: 0, 
            color: theme.palette.text.secondary,
            fontSize: '1rem',
            lineHeight: '1.5'
          }}>
            {shouldShowInstallGuide 
              ? "Install Level Up on your home screen to get push notifications and the best experience."
              : "Enable push notifications to stay updated on new events, updates, and opportunities."
            }
          </p>
        </div>

        {shouldShowInstallGuide ? (
          // iOS Installation Guide
          <div style={{ 
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 165, 245, 0.1)' : '#f8faff',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>To install:</div>
              <div>1. Tap the Share button <span style={{ fontSize: '1.2em' }}>⬆️</span></div>
              <div>2. Select "Add to Home Screen"</div>
              <div>3. Tap "Add" to install</div>
              <div>4. Open Level Up from your home screen</div>
            </div>
          </div>
        ) : (
          // Regular notification prompt
          <div style={{ 
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#f1f8e9',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: theme.palette.text.primary }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>You'll get notified about:</div>
              <div>• New networking events</div>
              <div>• Important updates and announcements</div>
              <div>• Professional development opportunities</div>
            </div>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          flexDirection: window.innerWidth < 400 ? 'column' : 'row'
        }}>
          {shouldShow && (
            <button
              onClick={handleEnable}
              style={{
                flex: 1,
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '44px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Enable Notifications
            </button>
          )}
          
          <button
            onClick={handleClose}
            style={{
              flex: shouldShow ? 0.7 : 1,
              backgroundColor: 'transparent',
              color: theme.palette.text.secondary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.palette.action.hover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            {shouldShowInstallGuide ? "Got it" : "Maybe Later"}
          </button>
        </div>

        <div style={{ 
          marginTop: '1rem', 
          textAlign: 'center',
          fontSize: '0.8rem',
          color: theme.palette.text.disabled
        }}>
          You can change this anytime in your profile settings
        </div>
      </div>
    </div>
  );
}