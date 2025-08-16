import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Heading
} from '@primer/react';
import ShadowDom from './ShadowDom.jsx';

const Overlay = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Creating issue with:', { title, description });
    // Here you would integrate with your GitHub API
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Wait for animation to complete
  };

  return (
    <ShadowDom>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          backdropFilter: 'blur(2px)'
        }}
      >
        <Box
          sx={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            transform: isVisible ? 'scale(1)' : 'scale(0.95)',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          {/* Header */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #e1e4e8'
          }}>
            <Heading sx={{ fontSize: 3, fontWeight: 'semibold', m: 0 }}>
              Create GitHub Issue
            </Heading>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#586069',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              ×
            </button>
          </Box>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Text as="label" sx={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#24292e',
                fontSize: '14px'
              }}>
                Issue Title <Text sx={{ color: 'danger.emphasis' }}>*</Text>
              </Text>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for your issue..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: '#ffffff'
                }}
                required
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Text as="label" sx={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#24292e',
                fontSize: '14px'
              }}>
                Description
              </Text>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the issue..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: '#ffffff',
                  lineHeight: '1.5'
                }}
              />
              <Text sx={{ fontSize: 0, color: 'fg.muted', mt: 1 }}>
                Supports GitHub Flavored Markdown
              </Text>
            </Box>

            {/* Action Buttons */}
            <Box sx={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '16px',
              borderTop: '1px solid #e1e4e8'
            }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: '#ffffff',
                  color: '#24292e',
                  border: '1px solid #d0d7de',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                style={{
                  background: title.trim() ? '#2ea44f' : '#94a3b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Create Issue
              </button>
            </Box>
          </form>
        </Box>
      </Box>
    </ShadowDom>
  );
};

export default Overlay;
