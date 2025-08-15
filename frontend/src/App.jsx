import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button, TextInput, Textarea, Select } from "@primer/react";
import FileUpload, { useFileDrop } from './FileUpload';
import { useAuth } from './AuthContext';
import './App.css';

// Main App component
const App = () => {
  const { user, logout } = useAuth();
  
  // --- STATE MANAGEMENT ---
  const [repoOptions, setRepoOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [gitIssue, setGitIssue] = useState({
    repo: "",
    assignee: "",
    title: "",
    body: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [originalRequest, setOriginalRequest] = useState();
  const [createdIssue, setCreatedIssue] = useState();
  
  // Screenshot state
  const [screenshot, setScreenshot] = useState(null);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  // Markdown preview states
  const [showChatPreview, setShowChatPreview] = useState(false);
  const [showBodyPreview, setShowBodyPreview] = useState(false);

  const messagesEndRef = useRef(null);

  // Extension auth token if provided
  const extensionAuthTokenRef = useRef(null);

  useEffect(() => {
    const receiveMessage = (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (data && data.type === 'EXT_AUTH_TOKEN') {
        extensionAuthTokenRef.current = data.token || null;
      }
    };
    window.addEventListener('message', receiveMessage);
    // Ask extension (background) for token if running inside extension iframe
    try {
      chrome?.runtime?.sendMessage?.({ action: 'getAuthToken' }, (resp) => {
        if (resp?.token) {
          extensionAuthTokenRef.current = resp.token;
        }
      });
    } catch {}
    return () => window.removeEventListener('message', receiveMessage);
  }, []);

  const authFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    const token = extensionAuthTokenRef.current;
    const withAuth = token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
    return fetch(url, { ...options, headers: withAuth, credentials: token ? 'omit' : 'include' });
  };

  // Helper function to insert text at cursor position
  const insertTextAtCursor = (textarea, textToInsert) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    
    const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
    textarea.value = newValue;
    
    // Set cursor position after inserted text
    const newCursorPos = start + textToInsert.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    return newValue;
  };

  // Helper function to handle file upload for chat input
  const handleChatFileUpload = (markdownLink) => {
    const textarea = document.querySelector('textarea[placeholder*="Type your message"]');
    if (textarea) {
      const newValue = insertTextAtCursor(textarea, markdownLink);
      setInput(newValue);
    }
  };

  // Helper function to handle file upload for issue body
  const handleBodyFileUpload = (markdownLink) => {
    const textarea = document.querySelector('textarea[placeholder*="Describe the issue"]');
    if (textarea) {
      const newValue = insertTextAtCursor(textarea, markdownLink);
      setGitIssue(prev => ({ ...prev, body: newValue }));
    }
  };

  // Use the drag and drop hooks for both textareas
  const chatDragDrop = useFileDrop(handleChatFileUpload, isDrafting || isCreating);
  const bodyDragDrop = useFileDrop(handleBodyFileUpload, isCreating);

  // Scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for screenshot data from the Chrome extension
  useEffect(() => {
    const handleMessage = (event) => {
      // Accept messages from any origin
      if (event.data.type === 'SCREENSHOT_DATA') {
        setScreenshot(event.data.screenshot);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "📸 Screenshot captured! You can include it in your GitHub issue below.",
          },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const resetState = () => {
    setMessages([]);
    setInput("");
    setGitIssue({
      repo: "",
      assignee: "",
      title: "",
      body: "",
    });
    setIsCreating(false);
    setIsDrafting(false);
    setOriginalRequest();
    setCreatedIssue();
    setScreenshot(null);
    setIncludeScreenshot(true);
    setShowChatPreview(false);
    setShowBodyPreview(false);
  };

  // MODIFICATION: Fetch repos and users from the backend on component load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [repoResponse, userResponse] = await Promise.all([
          authFetch("http://localhost:8000/repositories"),
          authFetch("http://localhost:8000/assignees"),
        ]);

        if (!repoResponse.ok || !userResponse.ok) {
          throw new Error("Network response was not ok.");
        }

        const repoData = await repoResponse.json();
        const userData = await userResponse.json();

        setRepoOptions(repoData);
        setAssigneeOptions(userData);

        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `Hello ${user?.name || user?.login}! I've loaded the latest repositories and users for you. How can I help you create a GitHub issue?`,
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Sorry, I couldn't connect to the backend to get repositories and users. Please ensure the server is running.",
          },
        ]);
      }
    };

    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (input.trim() === "") return;
    const newUserMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, newUserMessage]);
    processIssueInput(input.trim());
    setInput("");
  };

  // Process user input to extract GitHub issue details
  const processIssueInput = async (text) => {
    setIsDrafting(true);
    const lowerText = text.toLowerCase();

    if (lowerText.includes("create issue")) {
      handleCreateIssue();
      return;
    }

    let response;
    if (!originalRequest) {
      console.log("Original request being processed");
      response = await authFetch("http://localhost:8000/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_request: text }),
      });
      setOriginalRequest(text);
    } else {
      console.log("Update request being processed");
      response = await authFetch("http://localhost:8000/refine-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          original_request: originalRequest,
          current_draft: {
            repo_url: gitIssue.repo,
            assignee_username: gitIssue.assignee,
            title: gitIssue.title,
            body: gitIssue.body,
          },
          modification_request: text,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: "Failed to create issue. The server responded with an error.",
      }));
      throw new Error(errorData.message || "An unknown error occurred.");
    }

    const result = await response.json();
    setGitIssue({
      repo: result?.repo_url,
      assignee: result?.assignee_username,
      title: result?.title,
      body: result?.body,
    });
    const successMessage = `The git issue editor on the right has been successfully updated.`;
    setMessages((prev) => [...prev, { sender: "bot", text: successMessage }]);
    setIsDrafting(false);
  };

  // MODIFICATION: Call the backend to create the GitHub issue
  const handleCreateIssue = async () => {
    if (!gitIssue.repo || !gitIssue.title) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please make sure to provide at least a repository and a title.",
        },
      ]);
      return;
    }

    setIsCreating(true); // Disable button
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "Creating your issue..." },
    ]);

    try {
      let issueBody = gitIssue.body;

      const response = await authFetch("http://localhost:8000/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_url: gitIssue.repo,
          assignee_username: gitIssue.assignee,
          title: gitIssue.title,
          body: issueBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message:
            "Failed to create issue. The server responded with an error.",
        }));
        throw new Error(errorData.message || "An unknown error occurred.");
      }

      const result = await response.json();
      const successMessage = `✅ Success! Your issue has been created. You can view it here: ${
        result.issue_url || "N/A"
      }`;
      setCreatedIssue(result.issue_url);
      setMessages((prev) => [...prev, { sender: "bot", text: successMessage }]);
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      const errorMessage = `❌ Oops! Something went wrong: ${error.message}`;
      setMessages((prev) => [...prev, { sender: "bot", text: errorMessage }]);
    } finally {
      setIsCreating(false); // Re-enable button
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-inter">
      {/* Header with user info and logout */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">GitHub Issue Creator</h1>
            {user && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <img 
                  src={user.avatar_url} 
                  alt={user.name || user.login} 
                  className="w-6 h-6 rounded-full"
                />
                <span>{user.name || user.login}</span>
              </div>
            )}
          </div>
          {user && (
            <Button onClick={logout} variant="secondary" size="small">
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 p-4">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col p-4 bg-white shadow-md rounded-lg m-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Interactive Chat
          </h2>
          
          {/* Screenshot Display */}
          {screenshot && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">📸 Captured Screenshot</h3>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeScreenshot}
                    onChange={(e) => setIncludeScreenshot(e.target.checked)}
                    className="rounded"
                  />
                  <span>Include in issue</span>
                </label>
              </div>
              <div className="relative">
                <img
                  src={screenshot}
                  alt="Captured screenshot"
                  className="max-w-full h-auto rounded border border-gray-300 shadow-sm"
                  style={{ maxHeight: '200px' }}
                />
                <button
                  onClick={() => setScreenshot(null)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  title="Remove screenshot"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg shadow ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Message Input</h3>
              <Button
                onClick={() => setShowChatPreview(!showChatPreview)}
                variant="secondary"
                size="small"
              >
                {showChatPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            {showChatPreview ? (
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[200px] overflow-y-auto prose prose-sm max-w-none">
                {input ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {input}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500 italic">No content to preview</p>
                )}
              </div>
            ) : (
              <>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  placeholder="Type your message... (Supports markdown) - Drag and drop files here"
                  rows={10}
                  className={`w-full ${chatDragDrop.isDragOver ? 'border-blue-500 bg-blue-50' : ''}`}
                  {...chatDragDrop.dragHandlers}
                />
                <div className="text-xs text-gray-500 mt-1">
                  💡 Tip: You can drag and drop files directly onto this textarea
                </div>
                <div className="mt-2">
                  <FileUpload 
                    onFileUpload={handleChatFileUpload}
                    disabled={isDrafting || isCreating}
                    className="mb-2"
                  />
                </div>
              </>
            )}
          </div>
          <div>
            <Button
              onClick={handleSendMessage}
              variant="primary"
              inactive={isDrafting || isCreating}
              loading={isDrafting}
            >
              Send
            </Button>
          </div>
        </div>

        {/* GitHub Issue Preview Section */}
        <div className="flex-1 flex flex-col p-4 bg-white shadow-md rounded-lg m-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            GitHub Issue Preview
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-medium mb-2">GitHub Repository:</p>
              <Select
                value={gitIssue.repo}
                onChange={(e) =>
                  setGitIssue({ ...gitIssue, repo: e.target.value })
                }
                className="w-full"
              >
                <Select.Option value="">Select Repository</Select.Option>
                {repoOptions.map((option) => (
                  <Select.Option key={option.url} value={option.url}>
                    {option.url}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <p className="font-medium mb-2">Assignee:</p>
              <Select
                value={gitIssue.assignee}
                onChange={(e) =>
                  setGitIssue({ ...gitIssue, assignee: e.target.value })
                }
                className="w-full"
              >
                <Select.Option value="">Select Assignee</Select.Option>
                {assigneeOptions.map((option) => (
                  <Select.Option
                    key={option?.githubUsername}
                    value={option?.githubUsername}
                  >
                    {option?.githubUsername}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <p className="font-medium mb-2">Title:</p>
              <TextInput
                value={gitIssue.title}
                onChange={(e) =>
                  setGitIssue({ ...gitIssue, title: e.target.value })
                }
                placeholder="Enter issue title"
                className="w-full"
                block
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Body:</p>
                <Button
                  onClick={() => setShowBodyPreview(!showBodyPreview)}
                  variant="secondary"
                  size="small"
                >
                  {showBodyPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {showBodyPreview ? (
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[200px] overflow-y-auto prose prose-sm max-w-none">
                  {gitIssue.body ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {gitIssue.body}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-500 italic">No content to preview</p>
                  )}
                </div>
              ) : (
                <>
                  <Textarea
                    value={gitIssue.body}
                    onChange={(e) =>
                      setGitIssue({ ...gitIssue, body: e.target.value })
                    }
                    placeholder="Describe the issue... (Supports markdown) - Drag and drop files here"
                    rows={10}
                    className={`w-full ${bodyDragDrop.isDragOver ? 'border-blue-500 bg-blue-50' : ''}`}
                    {...bodyDragDrop.dragHandlers}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: You can drag and drop files directly onto this textarea
                  </div>
                  <div className="mt-2">
                    <FileUpload 
                      onFileUpload={handleBodyFileUpload}
                      disabled={isCreating}
                      className="mb-2"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          {createdIssue ? (
            <div className="flex">
              <Button onClick={() => window.open(createdIssue, "_blank")}>
                Go to issue
              </Button>
              <Button onClick={resetState} variant="primary">
                New issue
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCreateIssue}
              inactive={!gitIssue.repo || !gitIssue.title || isCreating}
              loading={isCreating}
              variant="primary"
            >
              {isCreating ? "Creating Issue..." : "Create Issue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
