import { useEffect, useMemo, useState } from "react"
import { MessageCircle, Search, Send, Shield, UserRound } from "lucide-react"
import { addDoc, collection, onSnapshot } from "firebase/firestore"
import { useApp } from "../contexts/AppContext"
import { db } from "../firebase/config"

export default function Chat() {
  const { userRole, currentUser, currentUserProfile, currentPlayerId, currentClubId, players, coaches } = useApp()
  const [messages, setMessages] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState("")
  const selfId = userRole === "player" ? `player:${currentPlayerId}` : `staff:${currentUserProfile?.id || currentUser}`
  const contacts = useMemo(() => {
    const staff = coaches.filter(item => item.clubId === currentClubId && item.id !== currentUserProfile?.id).map(item => ({ id:`staff:${item.id}`, name:item.fullName||item.username, role:item.role === "club-admin"?"Club Administrator":"Coach", isAdmin:item.role === "club-admin" }))
    const squad = players.filter(item => item.id !== currentPlayerId).map(item => ({ id:`player:${item.id}`, name:`${item.firstName||""} ${item.lastName||""}`.trim(), role:"Player", isAdmin:false }))
    return [...staff,...squad].sort((a,b) => Number(b.isAdmin)-Number(a.isAdmin) || a.name.localeCompare(b.name))
  }, [coaches,players,currentClubId,currentUserProfile?.id,currentPlayerId])
  const visibleContacts = contacts.filter(item => `${item.name} ${item.role}`.toLowerCase().includes(search.toLowerCase()))
  const selected = contacts.find(item => item.id === selectedId)
  const conversationId = selected ? [selfId,selected.id].sort().join("__") : ""

  useEffect(() => { if (!selectedId && contacts.length) setSelectedId((contacts.find(item=>item.isAdmin)||contacts[0]).id) }, [contacts,selectedId])
  useEffect(() => onSnapshot(collection(db,"clubMessages"), snapshot => setMessages(snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.clubId===currentClubId&&item.conversationId===conversationId).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)))), [currentClubId,conversationId])
  const send = async () => { const text=draft.trim(); if(!text||!selected)return; await addDoc(collection(db,"clubMessages"),{clubId:currentClubId,conversationId,participantIds:[selfId,selected.id],senderId:selfId,senderName:currentUserProfile?.fullName||currentUser||"User",recipientId:selected.id,text,createdAt:new Date().toISOString()}); setDraft("") }

  return <div className="club-chat-page min-h-screen p-4 md:p-8"><div className="max-w-6xl mx-auto space-y-6"><header className="page-hero"><span className="eyebrow">Club communications</span><h1 className="text-3xl md:text-5xl font-black text-slate-950">Club Chat</h1><p className="text-slate-500 mt-2">Club app users are listed as contacts. Every user can message the Club Administrator directly.</p></header><div className="club-chat-layout"><aside className="chat-contacts"><header><h2>Contacts</h2><label><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a person"/></label></header><div>{visibleContacts.map(contact=><button key={contact.id} onClick={()=>setSelectedId(contact.id)} className={selectedId===contact.id?"active":""}><span className={contact.isAdmin?"admin":""}>{contact.isAdmin?<Shield size={16}/>:<UserRound size={16}/>}</span><div><strong>{contact.name}</strong><small>{contact.role}</small></div>{contact.isAdmin&&<b>Admin</b>}</button>)}{!visibleContacts.length&&<p>No contacts found.</p>}</div></aside><section className="chat-conversation">{selected?<><header><span className={selected.isAdmin?"admin":""}>{selected.isAdmin?<Shield/>:<UserRound/>}</span><div><h2>{selected.name}</h2><p>{selected.role}</p></div></header><div className="chat-thread">{messages.map(message=><div key={message.id} className={message.senderId===selfId?"mine":"theirs"}><div><strong>{message.senderName}</strong><p>{message.text}</p><time>{new Date(message.createdAt).toLocaleString("en-GB")}</time></div></div>)}{!messages.length&&<div className="chat-empty"><MessageCircle/><strong>No messages yet</strong><span>Start a private conversation with {selected.name}.</span></div>}</div><footer><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={`Message ${selected.name}`}/><button onClick={send}><Send size={16}/><span>Send</span></button></footer></>:<div className="chat-empty"><MessageCircle/><strong>Select a contact</strong></div>}</section></div></div></div>
}
