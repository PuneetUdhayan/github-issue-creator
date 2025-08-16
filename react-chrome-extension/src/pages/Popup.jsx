import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  IconButton
} from '@primer/react';
import { IssueOpenedIcon, XIcon } from '@primer/octicons-react';

export default function Popup() {
  useEffect(() => {
    console.log("Hello from the popup!");
  }, []);

  const handleCreateIssue = () => {
    // Send message to content script to toggle overlay
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleOverlay' });
    });
  };

  return (
    <Box sx={{ width: 320, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            backgroundColor: 'success.emphasis',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <IssueOpenedIcon size={16} />
        </Box>
        <Heading sx={{ fontSize: 2, fontWeight: 'semibold', m: 0 }}>
          GitHub Issue Creator
        </Heading>
      </Box>

      <Text sx={{ color: 'fg.muted', mb: 3 }}>
        Create GitHub issues directly from any webpage. Click the button below to open the issue creation form.
      </Text>

      <Button
        variant="primary"
        onClick={handleCreateIssue}
        sx={{ width: '100%' }}
      >
        <IssueOpenedIcon size={16} />
        Create Issue
      </Button>

      <Text sx={{ fontSize: 0, color: 'fg.muted', mt: 2, textAlign: 'center' }}>
        Make sure you're on a GitHub repository page for the best experience.
      </Text>
    </Box>
  );
}
