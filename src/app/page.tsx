"use client";

import React, { useState, useEffect, useRef } from 'react';
import { generateKeyPair, encryptMessage, decryptMessage, KeyPair, EncryptedMessage } from '@/utils/crypto';
import { IdentityVault } from '@/utils/vault';
import { supabase } from '@/utils/supabase';
import {
  MessageCircle, Phone, CircleDot, Settings, Search, MoreVertical,
  Camera, Paperclip, Mic, Send, Check, CheckCheck, Plus, ArrowLeft,
  Shield, Lock, User, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface MessageLog {
  id: string;
  sender_username: string;
  receiver_username: string;
  encryptedContent: EncryptedMessage;
  timestamp: string;
}

interface UserProfile {
  username: string;
  public_key: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
}

type TabType = 'CHATS' | 'STATUS' | 'CALLS' | 'SETTINGS';

export default function WhatsAppSecureChat() {
  // Views
  const [view, setView] = useState<'BOOT' | 'AUTH' | 'MAIN' | 'CHAT'>('BOOT');
  const [activeTab, setActiveTab] = useState<TabType>('CHATS');

  // Auth
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Identity
  const [myKeys, setMyKeys] = useState<KeyPair | null>(null);
  const [myUsername, setMyUsername] = useState("");

  // Users & Chat
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- BOOT ---
  useEffect(() => {
    setTimeout(() => {
      const vault = localStorage.getItem('wa_vault');
      setIsRegistering(!vault);
      setView('AUTH');
    }, 2000);
  }, []);

  // --- FETCH USERS ---
  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      setUsers(data.map(u => ({
        username: u.username,
        public_key: u.public_key,
        lastMessage: "Tap to start secure chat",
        lastMessageTime: "",
        unread: 0
      })));
    }
  };

  // --- REALTIME MESSAGES ---
  useEffect(() => {
    if (view !== 'CHAT' && view !== 'MAIN') return;

    const channel = supabase.channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender_username === myUsername || newMsg.receiver_username === myUsername) {
          const encrypted: EncryptedMessage = {
            ciphertext: newMsg.ciphertext,
            nonce: newMsg.nonce,
            authorPublicKey: ""
          };
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              sender_username: newMsg.sender_username,
              receiver_username: newMsg.receiver_username,
              encryptedContent: encrypted,
              timestamp: newMsg.created_at
            }];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [view, myUsername]);

  // --- SCROLL TO BOTTOM ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("");

    try {
      if (isRegistering) {
        if (pin.length < 4 || !username.trim()) {
          setStatusMsg("Enter a valid name and 4+ digit PIN");
          return;
        }
        const keys = generateKeyPair();

        const { error } = await supabase.from('users').insert({
          username: username.trim(),
          public_key: keys.publicKey
        });
        if (error) throw error;

        const vault = await IdentityVault.lock(JSON.stringify({ ...keys, username: username.trim() }), pin);
        localStorage.setItem('wa_vault', vault);

        setMyKeys(keys);
        setMyUsername(username.trim());
        await fetchUsers();
        setView('MAIN');
      } else {
        const vault = localStorage.getItem('wa_vault');
        if (!vault) { setIsRegistering(true); return; }

        const json = await IdentityVault.unlock(vault, pin);
        if (!json) { setStatusMsg("Incorrect PIN"); return; }

        const data = JSON.parse(json);
        setMyKeys({ publicKey: data.publicKey, secretKey: data.secretKey });
        setMyUsername(data.username);
        await fetchUsers();
        setView('MAIN');
      }
    } catch (err: any) {
      setStatusMsg(err.message || "Error");
    }
  };

  // --- SEND MESSAGE ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedPeer || !myKeys) return;

    const encrypted = encryptMessage(inputMsg, myKeys.secretKey, selectedPeer.public_key);

    const { error } = await supabase.from('messages').insert({
      sender_username: myUsername,
      receiver_username: selectedPeer.username,
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext
    });

    if (!error) setInputMsg("");
  };

  // --- OPEN CHAT ---
  const openChat = (user: UserProfile) => {
    setSelectedPeer(user);
    setMessages([]);
    setView('CHAT');
    // Load past messages
    loadMessages(user.username);
  };

  const loadMessages = async (peerUsername: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_username.eq.${myUsername},receiver_username.eq.${myUsername}`)
      .order('created_at', { ascending: true });

    if (data) {
      const filtered = data.filter(m =>
        (m.sender_username === peerUsername && m.receiver_username === myUsername) ||
        (m.sender_username === myUsername && m.receiver_username === peerUsername)
      );
      setMessages(filtered.map(m => ({
        id: m.id,
        sender_username: m.sender_username,
        receiver_username: m.receiver_username,
        encryptedContent: { ciphertext: m.ciphertext, nonce: m.nonce, authorPublicKey: "" },
        timestamp: m.created_at
      })));
    }
  };

  // --- BOOT SCREEN ---
  if (view === 'BOOT') {
    return (
      <div className="boot-screen min-h-screen flex flex-col items-center justify-center text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-[#128C7E]" />
          </div>
          <h1 className="text-2xl font-light tracking-wider">SecureChat</h1>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Shield className="w-4 h-4" />
            <span>End-to-End Encrypted</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- AUTH SCREEN ---
  if (view === 'AUTH') {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#008069] p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-medium">{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="text-sm opacity-80 mt-1">Your messages are end-to-end encrypted</p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="p-6 space-y-4">
            {isRegistering && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-[#008069] py-2 text-lg transition-colors"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Security PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="w-full border-b-2 border-gray-200 focus:border-[#008069] py-2 text-2xl tracking-[0.5em] text-center transition-colors"
                placeholder="••••"
              />
            </div>

            {statusMsg && (
              <p className="text-red-500 text-sm text-center">{statusMsg}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#008069] hover:bg-[#006a57] text-white py-3 rounded-full font-medium transition-colors"
            >
              {isRegistering ? 'Get Started' : 'Unlock'}
            </button>

            {!isRegistering && (
              <button
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full text-red-500 text-sm py-2 hover:underline"
              >
                Reset & Create New Account
              </button>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  // --- MAIN SCREEN (WhatsApp Layout) ---
  if (view === 'MAIN') {
    const filteredUsers = users.filter(u =>
      u.username !== myUsername &&
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-[#F0F2F5] flex">
        {/* LEFT PANEL - Chat List */}
        <div className="w-full md:w-[400px] bg-white flex flex-col border-r border-gray-200">
          {/* Header */}
          <div className="h-14 bg-[#F0F2F5] flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DFE5E7] rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-[#54656F]" />
              </div>
              <span className="font-medium text-[#111B21]">{myUsername}</span>
            </div>
            <div className="flex items-center gap-4 text-[#54656F]">
              <button className="p-2 hover:bg-gray-200 rounded-full"><MessageSquare className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-gray-200 rounded-full"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Search */}
          <div className="p-2">
            <div className="bg-[#F0F2F5] rounded-lg flex items-center px-4 py-2 gap-3">
              <Search className="w-5 h-5 text-[#54656F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="bg-transparent flex-1 text-sm outline-none placeholder-[#667781]"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['CHATS', 'STATUS', 'CALLS'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab
                    ? 'text-[#008069] border-b-2 border-[#008069]'
                    : 'text-[#54656F] hover:bg-gray-50'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'CHATS' && (
              <>
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No contacts found</p>
                    <p className="text-sm">Start chatting with someone!</p>
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div
                      key={user.username}
                      onClick={() => openChat(user)}
                      className="chat-item flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[#E9EDEF]"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-[#DFE5E7] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-7 h-7 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium text-[#111B21] truncate">{user.username}</h3>
                          <span className="text-xs text-[#667781]">{user.lastMessageTime || ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                          <p className="text-sm text-[#667781] truncate">{user.lastMessage}</p>
                        </div>
                      </div>

                      {/* Unread Badge */}
                      {user.unread && user.unread > 0 && (
                        <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-medium">{user.unread}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'STATUS' && (
              <div className="p-8 text-center text-gray-500">
                <CircleDot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Status feature coming soon</p>
              </div>
            )}

            {activeTab === 'CALLS' && (
              <div className="p-8 text-center text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Calls feature coming soon</p>
              </div>
            )}
          </div>

          {/* FAB */}
          <button
            onClick={fetchUsers}
            className="fab absolute bottom-6 right-6 md:right-auto md:left-[340px] w-14 h-14 bg-[#00A884] rounded-full flex items-center justify-center text-white"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* RIGHT PANEL - Placeholder or Chat */}
        <div className="hidden md:flex flex-1 bg-[#F0F2F5] items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#00A884]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-[#00A884]" />
            </div>
            <h2 className="text-2xl text-[#41525D] mb-2">SecureChat for Desktop</h2>
            <p className="text-[#667781] max-w-md">
              Select a chat to start messaging. Your messages are end-to-end encrypted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- CHAT VIEW ---
  return (
    <div className="min-h-screen flex flex-col bg-[#EFEAE2]">
      {/* Chat Header */}
      <header className="h-14 bg-[#008069] flex items-center px-4 gap-3 text-white">
        <button onClick={() => setView('MAIN')} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-10 h-10 bg-[#DFE5E7] rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-[#54656F]" />
        </div>
        <div className="flex-1">
          <h2 className="font-medium">{selectedPeer?.username}</h2>
          <p className="text-xs opacity-80">End-to-End Encrypted</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-full"><Camera className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-white/10 rounded-full"><Phone className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-white/10 rounded-full"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 chat-bg-pattern">
        {/* E2EE Notice */}
        <div className="flex justify-center mb-4">
          <div className="bg-[#FFEFB8] text-[#54656F] text-xs px-3 py-1 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Messages are end-to-end encrypted
          </div>
        </div>

        {/* Message Bubbles */}
        <div className="space-y-1 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const isMe = msg.sender_username === myUsername;
            let content = "";

            if (isMe) {
              content = "📤 Encrypted";
            } else if (myKeys && selectedPeer) {
              const dec = decryptMessage(msg.encryptedContent, myKeys.secretKey, selectedPeer.public_key);
              content = dec || "🔒 Unable to decrypt";
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[65%] px-3 py-2 rounded-lg shadow-sm ${isMe
                      ? 'bg-[#D9FDD3] bubble-outgoing'
                      : 'bg-white bubble-incoming'
                    }`}
                >
                  <p className="text-[#111B21] text-sm break-words pr-12">{content}</p>
                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <span className="text-[10px] text-[#667781]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck className="w-4 h-4 text-[#53BDEB] double-check" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#F0F2F5] p-2 flex items-center gap-2">
        <button className="p-2 text-[#54656F] hover:bg-gray-200 rounded-full">
          <Paperclip className="w-6 h-6" />
        </button>

        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full flex items-center px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Type a message"
              className="flex-1 outline-none text-sm"
            />
            <button type="button" className="text-[#54656F] p-1">
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center text-white hover:bg-[#008c6f] transition-colors"
          >
            {inputMsg.trim() ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
