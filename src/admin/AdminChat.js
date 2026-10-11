import React, { useEffect, useRef, useState, useCallback } from "react";
import { ref, onValue, push } from "firebase/database";
import { db } from "../firebase";
import "./Admin.css";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminChat({ userId: propUserId }) {
  const params = useParams();
  const userId = propUserId || params?.userId;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const bottomRef = useRef(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  const isAtBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    bottomRef.current?.scrollIntoView({ behavior });
    isAtBottomRef.current = true;
    setShowJump(false);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 120;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      isAtBottomRef.current = atBottom;
      setShowJump(!atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const messagesRef = ref(db, `messages/${userId}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const msgArray = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      setMessages(msgArray);

      // allow small delay for DOM update then scroll if user is at bottom
      setTimeout(() => {
        if (isAtBottomRef.current) {
          if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          setShowJump(false);
        } else {
          setShowJump(true);
        }
      }, 60);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [userId]);

  const sendMessage = async () => {
    if (!text.trim() || !userId) return;

    const msgRef = ref(db, `messages/${userId}`);

    await push(msgRef, {
      sender: "admin",
      text,
      createdAt: Date.now(),
      type: "text",
    });

    setText("");
  };

  const sendFile = async () => {
    if (!file || !userId) return;

    const filePath = `uploads/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("public-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("public-files")
      .getPublicUrl(filePath);

    const imageUrl = urlData?.publicUrl || "";

    const msgRef = ref(db, `messages/${userId}`);
    await push(msgRef, {
      sender: "admin",
      imageUrl,
      createdAt: Date.now(),
      type: "image",
    });

    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-chat" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="adminchat-header">
        <div className="adminchat-header-avatar">{userId?.charAt(0)}</div>
        <div className="adminchat-header-info">
          <div className="adminchat-header-name">{userId || "Unknown User"}</div>
          <div className="adminchat-header-status">Online</div>
        </div>
      </div>

      <div className="adminchat-body" ref={bodyRef}>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div className="messages-inner" style={{ width: "100%", maxWidth: 720 }}>
            {messages.map((msg) => {
              const isAdmin = msg.sender === "admin";
              return (
                <div key={msg.id} className={isAdmin ? "row-admin" : "row-user"}>
                  <div className="bubble-wrapper">
                    {!isAdmin && (
                      <div className="user-avatar online" title={msg.sender || "User"}>
                        {(msg.sender || "U").charAt(0)}
                      </div>
                    )}

                    <div className={isAdmin ? "chat-bubble bubble-right" : "chat-bubble bubble-left"}>
                      {msg.type === "image" ? (
                        <img
                          src={msg.imageUrl || msg.url}
                          alt="upload"
                          className="bubble-img"
                          onClick={() =>
                            (msg.imageUrl || msg.url) && window.open(msg.imageUrl || msg.url, "_blank")
                          }
                        />
                      ) : (
                        <div className="bubble-text">{msg.text}</div>
                      )}

                      <div className="bubble-footer">
                        <div className="bubble-time">
                          {new Date(msg.createdAt || 0).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Jump to latest button */}
      {showJump && (
        <button
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest"
          style={{
            position: "fixed",
            right: 24,
            bottom: 96,
            zIndex: 60,
            background: "linear-gradient(180deg,#6b63ff,#5348e6)",
            color: "#fff",
            border: "none",
            padding: "8px 12px",
            borderRadius: 12,
            boxShadow: "0 8px 20px rgba(83,72,230,0.12)",
            cursor: "pointer",
          }}
        >
          Jump to latest
        </button>
      )}

      <div className="adminchat-inputbar">
        <label className="file-btn" title="Attach file" style={{ cursor: "pointer" }}>
          📎
          <input
            id="adminFileInput"
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
            }}
            ref={fileInputRef}
            hidden
          />
        </label>

        <input
          type="text"
          className="message-input"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button className="send-btn" onClick={sendMessage} aria-label="Send message">➤</button>

        <button
          onClick={sendFile}
          style={{
            marginLeft: 8,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.03)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </div>
    </div>
  );
}
