import React, { useRef, useState, useEffect } from "react";
import "./Admin.css";

/*
 Composer (with reply preview support)
 Props:
  - onSendText(text)
  - onSendFile(file, onProgress)
  - onTyping(bool)
  - replyTo: optional message object { id, text, sender }
  - onCancelReply()
*/
export default function Composer({ onSendText, onSendFile, onTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    // keep logic unchanged; placeholder for future UX
  }, [replyTo]);

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    const t = text.trim();
    if (t) {
      await onSendText && onSendText(t);
      setText("");
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (onSendFile) onSendFile(f, (p) => console.log("upload progress", p));
    fileRef.current.value = "";
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
      <input type="file" ref={fileRef} style={{ display: "none" }} onChange={handleFileChange} />
      <button type="button" className="file-btn" onClick={() => fileRef.current.click()} title="Attach file">📎</button>

      <div style={{ flex: 1 }}>
        {replyTo ? (
          <div className="reply-box" style={{ marginBottom: 8 }}>
            <div className="reply-name">
              Replying to <strong>{replyTo.sender === "admin" ? "You" : replyTo.sender}</strong>
            </div>
            <div className="reply-snippet" style={{ marginTop: 6 }}>
              {replyTo.text ? (replyTo.text.length > 140 ? replyTo.text.slice(0, 140) + "…" : replyTo.text) : (replyTo.type === "image" ? "Image" : replyTo.fileName || "File")}
            </div>
            <button
              type="button"
              onClick={() => onCancelReply && onCancelReply()}
              style={{ marginLeft: 12, border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer" }}
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        ) : null}

        <textarea
          className="message-input"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping && onTyping(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
              onTyping && onTyping(false);
            }
          }}
          style={{ width: "100%", minHeight: 44, resize: "vertical", padding: 12, borderRadius: 12, border: "none", background: "transparent", color: "inherit" }}
        />
      </div>

      <button type="submit" className="send-btn" aria-label="Send message">Send</button>
    </form>
  );
}
