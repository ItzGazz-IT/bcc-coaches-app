import { useEffect, useMemo, useState } from "react"
import { MessageCircle, Send, User, UserCog } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { db } from "../firebase/config"
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore"

function Chat() {
  const { userRole, currentPlayerId, currentUser, players } = useApp()
  const [messages, setMessages] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [newMessage, setNewMessage] = useState("")

  const isPlayer = userRole === "player"
  const activePlayerId = isPlayer ? currentPlayerId : selectedPlayerId

  useEffect(() => {
    if (!isPlayer && !selectedPlayerId && players.length > 0) {
      setSelectedPlayerId(players[0].id)
    }
  }, [isPlayer, selectedPlayerId, players])

  useEffect(() => {
    if (!activePlayerId) {
      setMessages([])
      return
    }

    const messagesQuery = query(
      collection(db, "playerCoachMessages"),
      where("playerId", "==", activePlayerId)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const data = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

      setMessages(data)
    })

    return () => unsubscribe()
  }, [activePlayerId])

  const activePlayer = useMemo(() => {
    if (!activePlayerId) return null
    return players.find((p) => p.id === activePlayerId) || null
  }, [players, activePlayerId])

  const sendMessage = async () => {
    const trimmed = newMessage.trim()
    if (!trimmed || !activePlayerId) return

    try {
      await addDoc(collection(db, "playerCoachMessages"), {
        playerId: activePlayerId,
        senderRole: isPlayer ? "player" : "coach",
        senderName: currentUser || (isPlayer ? "Player" : "Coach"),
        text: trimmed,
        createdAt: new Date().toISOString()
      })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending chat message:", error)
      window.alert("Could not send message. Please try again.")
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
            {isPlayer ? "Coach Chat" : "Player Chat"}
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            {isPlayer ? "One-on-one chat with your coach" : "One-on-one chats with players"}
          </p>
        </div>

        {!isPlayer && (
          <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.firstName} {player.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center gap-2">
            <MessageCircle className="text-blue-600" size={20} />
            <h2 className="font-bold text-gray-800">
              {activePlayer ? `${activePlayer.firstName} ${activePlayer.lastName}` : "Conversation"}
            </h2>
          </div>

          <div className="p-4 space-y-3 h-[420px] overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-10">No messages yet. Start the conversation.</div>
            )}

            {messages.map((message) => {
              const fromCoach = message.senderRole === "coach"
              return (
                <div
                  key={message.id}
                  className={`flex ${fromCoach ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      fromCoach ? "bg-white border border-gray-200" : "bg-blue-600 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-xs font-semibold opacity-80">
                      {fromCoach ? <UserCog size={12} /> : <User size={12} />}
                      <span>{message.senderName || (fromCoach ? "Coach" : "Player")}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-[10px] mt-2 ${fromCoach ? "text-gray-500" : "text-blue-100"}`}>
                      {message.createdAt ? new Date(message.createdAt).toLocaleString("en-GB") : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage()
                }}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-2"
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
