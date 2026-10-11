// src/admin/AdminMessages.js
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

export default function AdminMessages() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const messagesRef = ref(db, "messages");

    const off = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setUsers([]);
        return;
      }

      const userList = Object.entries(data)
        .map(([userId, msgs]) => {
          if (!msgs) return null;

          const msgArray = Object.entries(msgs).map(([id, value]) => ({
            id,
            ...value,
          }));

          if (msgArray.length === 0) return null;

          // Sort by date (newest first)
          msgArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          const latest = msgArray[0];

          return {
            userId,
            latestMessage: {
              text: latest.text || "",
              sender: latest.sender || "unknown",
              createdAt: latest.createdAt || 0,
              type: latest.type,
              fileName: latest.fileName,
            },
          };
        })
        .filter(Boolean); // remove invalid entries

      // Sort users by message time
      userList.sort(
        (a, b) =>
          (b.latestMessage?.createdAt || 0) -
          (a.latestMessage?.createdAt || 0)
      );

      setUsers(userList);
    });

    return () => off();
  }, []);

  const openChat = (userId) => {
    navigate(`/admin/chat/${encodeURIComponent(userId)}`);
  };

  if (users.length === 0) {
    return (
      <div className="admin-users" style={{ padding: 12 }}>
        <h2 className="admin-title">Messages</h2>
        <div className="no-msg">No messages found.</div>
      </div>
    );
  }

  return (
    <div className="admin-users" style={{ padding: 12 }}>
      <h2 className="admin-title">Messages</h2>

      <div className="users-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map(({ userId, latestMessage }) => {
          const preview =
            latestMessage.type === "image"
              ? "Image"
              : latestMessage.type === "file"
              ? latestMessage.fileName || "File"
              : latestMessage.text || "No message";

          const timeLabel = latestMessage.createdAt
            ? new Date(latestMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";

          return (
            <div
              key={userId}
              className="user-item"
              onClick={() => openChat(userId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openChat(userId)}
            >
              <div className="user-left">
                <div className="user-avatar" title={userId}>
                  {userId?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div className="user-meta">
                  <div className="user-id">{userId}</div>
                  <div className="last-msg">{preview}</div>
                </div>
              </div>

              <div className="user-right">
                <div className="time">{timeLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
