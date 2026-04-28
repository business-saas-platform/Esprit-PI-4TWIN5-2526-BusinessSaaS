import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';

const PlatformSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);

  // ID statique pour Mariem (Admin)
  const ADMIN_ID = "admin-mariem-id"; 

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Charger la liste des réclamations
  useEffect(() => {
    fetch('/api/communication/admin/reclamations')
      .then(res => res.json())
      .then(data => setTickets(data));
  }, []);

  // 2. Écouter le temps réel (new_message)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // On n'ajoute le message que s'il appartient au ticket ouvert
      if (selectedChannel && msg.channelId === selectedChannel.id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [socket, selectedChannel]);

  // 3. Sélectionner un ticket
  const handleSelectTicket = (ticket) => {
    setSelectedChannel(ticket);
    
    // Rejoindre la room WebSocket
    if (socket) {
      socket.emit('join_channel', { channelId: ticket.id });
    }

    // Charger l'historique API
    fetch(`/api/communication/admin/channels/${ticket.id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data));
  };

  // 4. Répondre
  const sendReply = () => {
    if (!inputText.trim() || !selectedChannel || !socket) return;

    const payload = {
      channelId: selectedChannel.id,
      businessId: selectedChannel.businessId,
      content: inputText,
      senderId: ADMIN_ID,
      senderName: 'Mariem Ferjaani',
    };

    socket.emit('send_message', payload);
    setInputText("");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-card rounded-xl shadow-lg border overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        <div className="p-4 border-b font-bold bg-card">Tickets Support ({tickets.length})</div>
        <div className="flex-1 overflow-y-auto">
          {tickets.map(t => (
            <div 
              key={t.id} 
              onClick={() => handleSelectTicket(t)}
              className={`p-4 cursor-pointer border-b transition ${selectedChannel?.id === t.id ? 'bg-red-50 border-l-4 border-red-600' : 'hover:bg-muted'}`}
            >
              <p className="font-bold text-sm text-foreground">Business ID: {t.businessId.slice(0,8)}</p>
              <p className="text-xs text-muted-foreground truncate">{t.description || "Nouvelle réclamation"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-card">
        {selectedChannel ? (
          <>
            <div className="p-4 border-b flex justify-between items-center shadow-sm">
              <span className="font-bold text-foreground">Discussion : {selectedChannel.id.slice(0,8)}</span>
              <button className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-full uppercase font-bold">Ouvert</button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-background/30">
              {messages.map((msg, i) => (
                <div key={i} className={`mb-4 flex flex-col ${msg.senderId === ADMIN_ID ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${msg.senderId === ADMIN_ID ? 'bg-red-600 text-white rounded-tr-none' : 'bg-card border text-foreground rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 uppercase">{msg.senderName}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-card">
              <div className="flex gap-2 bg-muted p-2 rounded-2xl">
                <input 
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm"
                  placeholder="Écrire votre réponse..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                />
                <button 
                  onClick={sendReply}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition"
                >
                  Répondre
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-5xl mb-2">📩</div>
            <p className="font-medium">Sélectionnez un ticket pour répondre au client</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformSupport;