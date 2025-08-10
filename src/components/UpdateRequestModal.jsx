import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const UPDATE_CATEGORIES = [
  { value: 'achievement', label: '🏆 Student Achievement' },
  { value: 'recognition', label: '⭐ Coach/Staff Recognition' },
  { value: 'other', label: '📝 Other' }
];

export default function UpdateRequestModal({ open, onClose }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    details: '',
    hasPhotos: false,
    photoDescription: '',
    submitterName: '',
    submitterEmail: ''
  });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear any previous errors
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.title.trim() || !formData.category || !formData.description.trim() || 
        !formData.submitterName.trim() || !formData.submitterEmail.trim()) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.submitterEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // For now, use mailto as fallback until EmailJS is configured
    const categoryLabel = UPDATE_CATEGORIES.find(cat => cat.value === formData.category)?.label || formData.category;
    const emailSubject = `Update Request: ${formData.title}`;
    
    const photoSection = formData.hasPhotos ? `

**PHOTOS TO INCLUDE:**
${formData.photoDescription || 'Photos will be attached to this email'}

**Please make sure to attach any photos you want included with this update.**` : '';

    const emailBody = `
UPDATE REQUEST DETAILS
======================

Title: ${formData.title}
Category: ${categoryLabel}
Submitted by: ${formData.submitterName} (${formData.submitterEmail})
Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

DESCRIPTION:
${formData.description}

ADDITIONAL DETAILS:
${formData.details || 'None provided'}${photoSection}

Please review this update request and let the team know if you'd like to feature it in our updates feed.
    `;

    // Create mailto link with multiple recipients
    const recipients = 'jim@levelupcincinnati.org,bryan@levelupcincinnati.org,hello@levelupcincinnati.org';
    const mailto = `mailto:${recipients}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open email client
    window.location.href = mailto;
    
    // Show success after a brief delay
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    }, 500);

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      description: '',
      details: '',
      hasPhotos: false,
      photoDescription: '',
      submitterName: '',
      submitterEmail: ''
    });
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    onClose();
    if (!loading) {
      resetForm();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          📝 Request an Update
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Submit your update idea to the Level Up team
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              🎉 Update request sent successfully! We'll review it soon.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Update Title */}
            <TextField
              label="Update Title *"
              value={formData.title}
              onChange={handleInputChange('title')}
              placeholder="e.g., John's Internship Success Story"
              fullWidth
              required
            />

            {/* Category */}
            <TextField
              select
              label="Category *"
              value={formData.category}
              onChange={handleInputChange('category')}
              fullWidth
              required
            >
              {UPDATE_CATEGORIES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            {/* Description */}
            <TextField
              label="Description *"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Briefly describe what this update would cover..."
              multiline
              rows={3}
              fullWidth
              required
            />

            {/* Additional Details */}
            <TextField
              label="Additional Details"
              value={formData.details}
              onChange={handleInputChange('details')}
              placeholder="Any additional context, dates, people to mention, etc."
              multiline
              rows={2}
              fullWidth
            />

            {/* Photos Section */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasPhotos}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasPhotos: e.target.checked }))}
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>📷 I have photos to include with this update</Typography>}
              />
              
              {formData.hasPhotos && (
                <TextField
                  label="Photo Description"
                  value={formData.photoDescription}
                  onChange={handleInputChange('photoDescription')}
                  placeholder="Briefly describe the photos you'll attach (e.g., John receiving his internship offer letter)"
                  multiline
                  rows={2}
                  fullWidth
                  sx={{ mt: 2 }}
                  helperText="📎 You'll be able to attach photos when your email client opens"
                />
              )}
            </Box>

            {/* Submitter Info */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Your Name *"
                value={formData.submitterName}
                onChange={handleInputChange('submitterName')}
                fullWidth
                required
              />
              <TextField
                label="Your Email *"
                type="email"
                value={formData.submitterEmail}
                onChange={handleInputChange('submitterEmail')}
                fullWidth
                required
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ minWidth: 80 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading || success}
            sx={{ minWidth: 120 }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : success ? (
              'Sent!'
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}