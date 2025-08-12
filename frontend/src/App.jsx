import React, { useState, useEffect, useRef } from "react";

import { Button, TextInput, Textarea, Select } from "@primer/react";

// Main App component
const App = () => {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [gitIssue, setGitIssue] = useState({
    repo: "",
    assignee: "",
    title: "",
    body: "",
  });

  // MODIFICATION: State for dynamic options and loading status
  const [repoOptions, setRepoOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [isCreating, setIsCreating] = useState(false); // To track API call status
  const [originalRequest, setOriginalRequest] = useState();

  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // MODIFICATION: Fetch repos and users from the backend on component load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch both endpoints concurrently
        const [repoResponse, userResponse] = await Promise.all([
          fetch("http://localhost:8000/repositories"),
          fetch("http://localhost:8000/assignees"),
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
            text: "Hello! I've loaded the latest repositories and users for you. How can I help you create a GitHub issue?",
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

    fetchInitialData();
  }, []);

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
    const lowerText = text.toLowerCase();

    if (lowerText.includes("create issue")) {
      handleCreateIssue();
      return;
    }

    let response;
    if (!originalRequest) {
      console.log("Original request being processed")
      response = await fetch("http://localhost:8000/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_request: text }),
      });
      setOriginalRequest(text);
    } else {
      console.log("Update request being processed")
      response = await fetch("http://localhost:8000/refine-draft", {
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
      // Get more detailed error from backend if available
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
      const response = await fetch("http://localhost:8000/gitissue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gitIssue),
      });

      if (!response.ok) {
        // Get more detailed error from backend if available
        const errorData = await response.json().catch(() => ({
          message:
            "Failed to create issue. The server responded with an error.",
        }));
        throw new Error(errorData.message || "An unknown error occurred.");
      }

      const result = await response.json();
      const successMessage = `✅ Success! Your issue has been created. You can view it here: ${result.url || "N/A"
        }`;
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
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-inter">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col p-4 bg-white shadow-md rounded-lg m-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Interactive Chat
        </h2>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg shadow ${msg.sender === "user"
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
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Type your message..."
            rows={10}
            className="w-full"
          />

        </div>
        <div>
          <Button
            onClick={handleSendMessage}
            variant="primary"
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
              onChange={(e) => setGitIssue({ ...gitIssue, repo: e.target.value })}
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
              onChange={(e) => setGitIssue({ ...gitIssue, assignee: e.target.value })}
              className="w-full"
            >
              <Select.Option value="">Select Assignee</Select.Option>
              {assigneeOptions.map((option) => (
                <Select.Option key={option?.githubUsername} value={option?.githubUsername}>
                  {option?.githubUsername}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <p className="font-medium mb-2">Title:</p>
            <TextInput
              value={gitIssue.title}
              onChange={(e) => setGitIssue({ ...gitIssue, title: e.target.value })}
              placeholder="Enter issue title"
              className="w-full"
              block
            />
          </div>
          <div>
            <p className="font-medium mb-2">Body:</p>
            <Textarea
              value={gitIssue.body}
              onChange={(e) => setGitIssue({ ...gitIssue, body: e.target.value })}
              placeholder="Describe the issue..."
              rows={10}
              className="w-full"
            />
          </div>
        </div>
        <Button
          onClick={handleCreateIssue}
          disabled={!gitIssue.repo || !gitIssue.title || isCreating}
          variant="success"
        >
          {isCreating ? "Creating Issue..." : "Create Issue"}
        </Button>
      </div>
    </div>
  );
};

export default App;
