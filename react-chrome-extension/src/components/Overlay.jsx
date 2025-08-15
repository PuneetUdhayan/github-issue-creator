import React, { useState, useEffect } from 'react';
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
      <div style={{
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
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '0',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease-in-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e1e4e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafbfc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#2ea44f',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                🐙
              </div>
              <h2 style={{
                margin: 0,
                color: '#24292e',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Create GitHub Issue
              </h2>
            </div>
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
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f6f8fa';
                e.target.style.color = '#24292e';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#586069';
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#24292e',
                  fontSize: '14px'
                }}>
                  Issue Title <span style={{ color: '#d73a49' }}>*</span>
                </label>
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
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0969da';
                    e.target.style.outline = 'none';
                    e.target.style.boxShadow = '0 0 0 3px rgba(9, 105, 218, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d0d7de';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#24292e',
                  fontSize: '14px'
                }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a detailed description of the issue, including steps to reproduce, expected behavior, and actual behavior..."
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
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0969da';
                    e.target.style.outline = 'none';
                    e.target.style.boxShadow = '0 0 0 3px rgba(9, 105, 218, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d0d7de';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#656d76'
                }}>
                  Supports GitHub Flavored Markdown
                </div>
              </div>

              {/* Additional Fields */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#24292e',
                    fontSize: '14px'
                  }}>
                    Labels
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff'
                  }}>
                    <option value="">Select labels...</option>
                    <option value="bug">🐛 Bug</option>
                    <option value="enhancement">✨ Enhancement</option>
                    <option value="documentation">📚 Documentation</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#24292e',
                    fontSize: '14px'
                  }}>
                    Priority
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff'
                  }}>
                    <option value="">Select priority...</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="critical">🚨 Critical</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
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
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f6f8fa';
                    e.target.style.borderColor = '#8c959f';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.borderColor = '#d0d7de';
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
                  onMouseEnter={(e) => {
                    if (title.trim()) {
                      e.target.style.backgroundColor = '#2c974b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (title.trim()) {
                      e.target.style.backgroundColor = '#2ea44f';
                    }
                  }}
                >
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ShadowDom>
  );
};

export default Overlay;
