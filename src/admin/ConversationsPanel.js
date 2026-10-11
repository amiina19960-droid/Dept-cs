import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConversationListItem from "./ConversationListItem";
import "./Admin.css";
import { ref as dbRef, onValue, off } from "firebase/database";
import { db } from "../firebase";
import { useAdmin } from "./AdminContext";

/*
  ConversationsPanel

  - Shows conversation list.
  - Marks Giulia (or any configured user in PROTECTED_CHATS) with a lock badge.
  - Clicking a protected user simply navigates to /admin/chat/:userId — the ChatPanel is responsible
    for showing the unlock modal and blocking subscriptions if the conversation is protected and locked.
  - Unlocked status is read from localStorage (UNLOCKED_KEY) so ChatPanel can use the same unlocked state.
  - NOTE: This is client-side protection only. For real security, enforce server-side auth
    or Firebase Security Rules.
*/

/**
 * PROTECT THIS USER:
 * Replace 'change_this_password' with the password you want to require to open Giulia's chat.
 * The actual unlock/checking should be implemented/viewed in ChatPanel.
 */
const PROTECTED_CHATS = {
  Giulia: "change_this_password" // <-- set the password you want for Giulia here
};

const UNLOCKED_KEY = "unlockedProtectedChats_client_v1";

function readUnlocked() {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

export default function ConversationsPanel() {
  const { activeConversation, setActiveConversation } = useAdmin();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    try {
      const raw = localStorage.getItem("hiddenConversations");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Listen for localStorage changes (hiddenConversations and unlocked list)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "hiddenConversations") {
        try {
          setHiddenConversations(e.newValue ? JSON.parse(e.newValue) : []);
        } catch (err) {
          setHiddenConversations([]);
        }
      }
      // unlocked list may change in other tabs — we don't need to act here,
      // ChatPanel will read UNLOCKED_KEY when it mounts/when activeConversation changes.
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const messagesRef = dbRef(db, "messages");

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setList([]);
        setLoading(false);
        return;
      }

      // Convert messages into a list
      const users = Object.entries(data)
        .map(([userId, msgs]) => {
          if (!msgs) return null;

          const arr = Object.values(msgs);

          // Sort by time
          arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const last = arr[0] || {};

          let lastMsgText = "";
          if (last.type === "text") lastMsgText = last.text || "";
          else if (last.type === "image") lastMsgText = "📷 Image";
          else if (last.type === "file") lastMsgText = last.fileName || "📁 File";

          return {
            userId,
            lastMessage: lastMsgText,
            lastSender: last.sender || "unknown",
            lastTimestamp: last.createdAt || 0,
            unreadCount: 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

      setList(users);
      setLoading(false);
    });

    return () => {
      off(messagesRef);
      unsubscribe && unsubscribe();
    };
  }, []);

  // Filter out locally-hidden conversations
  const visibleList = list.filter((c) => !hiddenConversations.includes(c.userId));

  // Clicking a conversation navigates to the chat. If the conversation is protected,
  // ChatPanel will detect that and present the unlock modal (ChatPanel is the single place
  // for unlocking and blocking access).
  const handleClick = (userId) => {
    setActiveConversation(userId);
    navigate(`/admin/chat/${encodeURIComponent(userId)}`);
  };

  return (
    <div className="admin-users">
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="admin-title" style={{ margin: 0 }}>Conversations</h2>
      </div>

      <div className="users-list" style={{ padding: 8 }}>
        {loading ? (
          <div className="no-msg">Loading conversations…</div>
        ) : visibleList.length === 0 ? (
          <div className="no-msg">No conversations</div>
        ) : (
          visibleList.map((c) => {
            const isProtected = PROTECTED_CHATS && Object.prototype.hasOwnProperty.call(PROTECTED_CHATS, c.userId);
            const unlocked = readUnlocked();
            const isUnlocked = unlocked.includes(c.userId);

            return (
              <div
                key={c.userId}
                onClick={() => handleClick(c.userId)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 6px",
                  borderRadius: 8,
                  marginBottom: 6,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick(c.userId)}
              >
                {/* Left: small lock badge if protected */}
                {isProtected ? (
                  <div style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: 8,
                    background: isUnlocked ? "linear-gradient(90deg,#06b6d4,#2563eb)" : "rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isUnlocked ? "#fff" : "#374151",
                    fontWeight: 700,
                    marginRight: 8,
                    fontSize: 14
                  }} title={isUnlocked ? "Unlocked" : "Protected"}>
                    {isUnlocked ? "🔓" : "🔒"}
                  </div>
                ) : (
                  <div style={{ width: 12, marginRight: 8 }} />
                )}

                <div style={{ flex: 1 }}>
                  <ConversationListItem
                    user={c}
                    active={activeConversation === c.userId}
                    onClick={() => handleClick(c.userId)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
