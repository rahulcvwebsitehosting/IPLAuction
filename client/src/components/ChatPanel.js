import React, { useState, useRef, useEffect } from "react";

export default function ChatPanel({ messages, onSendMessage, disabled }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText("");
  };

  return (
    <div className="chat-panel">
      <h4>Chat</h4>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet</div>
        )}
        {messages.map((msg, i) => (
          <div key={msg._id || i} className="chat-msg">
            <span className="chat-user">{msg.userName || msg.userId}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button
          type="submit"
          className="btn btn-chat-send"
          disabled={!text.trim() || disabled}
        >
          Send
        </button>
      </form>
    </div>
  );
}
