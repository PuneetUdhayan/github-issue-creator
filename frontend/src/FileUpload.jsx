import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@primer/react';

// Custom hook for drag and drop functionality
export const useFileDrop = (onFileUpload, disabled = false) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [disabled]);

  const handleFileUpload = async (file) => {
    if (disabled) return;

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload-file', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.file_url) {
        // Generate markdown link based on file type
        const fileName = file.name;
        let markdownLink;
        
        // Check if it's an image file
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        
        if (imageExtensions.includes(fileExtension)) {
          // For images, use markdown image syntax
          markdownLink = `![${fileName}](${result.file_url})`;
        } else {
          // For other files, use markdown link syntax
          markdownLink = `[${fileName}](${result.file_url})`;
        }
        
        onFileUpload(markdownLink);
      } else {
        console.error('File upload failed:', result.error_message);
        alert(`File upload failed: ${result.error_message}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    }
  };

  return {
    isDragOver,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    handleFileUpload,
  };
};

// FileUpload component now only provides the file input button
const FileUpload = ({ onFileUpload, disabled = false, className = "" }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file) => {
    if (disabled || isUploading) return;

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload-file', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.file_url) {
        // Generate markdown link based on file type
        const fileName = file.name;
        let markdownLink;
        
        // Check if it's an image file
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        
        if (imageExtensions.includes(fileExtension)) {
          // For images, use markdown image syntax
          markdownLink = `![${fileName}](${result.file_url})`;
        } else {
          // For other files, use markdown link syntax
          markdownLink = `[${fileName}](${result.file_url})`;
        }
        
        onFileUpload(markdownLink);
      } else {
        console.error('File upload failed:', result.error_message);
        alert(`File upload failed: ${result.error_message}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <Button
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        variant="secondary"
        size="small"
      >
        {isUploading ? (
          <>
            <span style={{ marginRight: '8px' }}>⏳</span>
            Uploading...
          </>
        ) : (
          'Choose File'
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
    </div>
  );
};

export default FileUpload;
