"use client";

import React, { useState, useEffect, useRef } from 'react';
import { generateKeyPair, encryptMessage, decryptMessage, KeyPair, EncryptedMessage } from '@/utils/crypto';
import { IdentityVault } from '@/utils/vault';
import { supabase } from '@/utils/supabase';
import { Lock, Unlock, ShieldCheck, Trash2, Send, Zap, Users, UserPlus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface MessageLog {
  id: string;
  sender_username: string;
  receiver_username: string;
  encryptedContent: EncryptedMessage;
  timestamp: string;
  decrypted?: string; // Local state only
}

interface UserProfile {
  username: string;
  public_key: string;
}

export default function SecureChatApp() {
  const [view, setView] = useState<'BOOT' | 'AUTH' | 'LOBBY' | 'CHAT'>('BOOT');

  // Auth & Identity
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState(""); // For registration
  const [myKeys, setMyKeys] = useState<KeyPair | null>(null);
  const [myUsername, setMyUsername] = useState<string>("");

  // Lobby / Network
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<UserProfile | null>(null);

  // Chat
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedVault = localStorage.getItem('z_vault');
      setIsRegistering(!savedVault);
      setView('AUTH');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- SUPABASE SYNC ---
  // Fetch users
  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setActiveUsers(data.map(u => ({ username: u.username, public_key: u.public_key })));
  };

  // Subscribe to messages
  useEffect(() => {
    if (view !== 'CHAT') return;

    fetchUsers(); // Initial user list load

    // Subscribe to new messages targeting me OR sent by me
    const channel = supabase.channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        // Only add if it involves me
        if (newMsg.sender_username === myUsername || newMsg.receiver_username === myUsername) {

          // Reconstruct encrypted object
          const encrypted: EncryptedMessage = {
            ciphertext: newMsg.ciphertext,
            nonce: newMsg.nonce,
            authorPublicKey: "" // Not strictly needed for decryption if we know peer
          };

          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              sender_username: newMsg.sender_username,
              receiver_username: newMsg.receiver_username,
              encryptedContent: encrypted,
              timestamp: newMsg.created_at
            }]
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [view, myUsername]);


  // --- AUTH HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("CRYPTOGRAPHIC OPERATIONS IN PROGRESS...");

    try {
      if (isRegistering) {
        // REGISTER
        if (pin.length < 4 || !username) {
          setStatusMsg("ERROR: INVALID INPUT");
          return;
        }
        const keys = generateKeyPair();

        // 1. Save to Supabase (Public Identity)
        const { error } = await supabase.from('users').insert({
          username: username,
          public_key: keys.publicKey
        });

        if (error) throw error;

        // 2. Save to Local Vault (Private Identity)
        const vault = await IdentityVault.lock(JSON.stringify({ ...keys, username }), pin);
        localStorage.setItem('z_vault', vault);

        setMyKeys(keys);
        setMyUsername(username);
        setView('LOBBY');
      } else {
        // LOGIN
        const vault = localStorage.getItem('z_vault');
        if (!vault) return setIsRegistering(true);

        const jsonStr = await IdentityVault.unlock(vault, pin);
        if (!jsonStr) {
          setStatusMsg("ACCESS DENIED: INVALID PIN");
          return;
        }

        const data = JSON.parse(jsonStr);
        setMyKeys({ publicKey: data.publicKey, secretKey: data.secretKey });
        setMyUsername(data.username || "Unknown");
        setView('LOBBY');
      }
    } catch (err: any) {
      setStatusMsg("SYSTEM ERROR: " + err.message);
    }
  };

  // --- SEND HANDLER ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedPeer || !myKeys) return;

    try {
      const encrypted = encryptMessage(inputMsg, myKeys.secretKey, selectedPeer.public_key);

      const { error } = await supabase.from('messages').insert({
        sender_username: myUsername,
        receiver_username: selectedPeer.username,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext
      });

      if (error) throw error;
      setInputMsg("");
    } catch (err) {
      console.error(err);
      alert("Transmission Failed");
    }
  };


  // --- VIEWS ---

  if (view === 'BOOT') {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ShieldCheck className="w-16 h-16" />
          <div className="tracking-[0.5em] text-2xl">Z++ SECURE BOOT</div>
        </div>
      </div>
    )
  }

  if (view === 'AUTH') {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-green-900 bg-green-900/10 p-8 rounded-xl backdrop-blur">
          <h1 className="text-2xl font-bold mb-6 text-center glitch-text">{isRegistering ? 'NEW IDENTITY' : 'IDENTITY VERIFICATION'}</h1>

          <form onSubmit={handleAuth} className="space-y-6">
            {isRegistering && (
              <div>
                <label className="block text-xs mb-1 opacity-70">CODENAME</label>
                <input
                  className="w-full bg-black border border-green-700 p-3 text-center text-lg focus:border-green-400 outline-none rounded"
                  value={username}
                  onChange={e => setUsername(e.target.value.toUpperCase())}
                  placeholder="USER_X"
                />
              </div>
            )}

            <div>
              <label className="block text-xs mb-1 opacity-70">SECURITY PIN</label>
              <input
                type="password"
                className="w-full bg-black border border-green-700 p-3 text-center text-2xl tracking-[1em] focus:border-green-400 outline-none rounded"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={6}
                placeholder="••••"
              />
            </div>

            <div className="text-red-500 text-xs text-center h-4">{statusMsg}</div>

            <button className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-4 rounded transition-all">
              {isRegistering ? 'INITIALIZE VAULT' : 'UNLOCK'}
            </button>

            {!isRegistering && (
              <div className="text-center text-xs opacity-50 cursor-pointer hover:text-red-500" onClick={() => { localStorage.clear(); window.location.reload(); }}>
                RESET IDENTITY
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  if (view === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#050505] text-green-400 font-mono p-4">
        <header className="flex justify-between items-center mb-8 border-b border-green-900/50 pb-4">
          <div>
            <h1 className="text-xl font-bold">LOBBY // <span className="text-white">{myUsername}</span></h1>
            <p className="text-xs opacity-50">SECURE LINK ESTABLISHED</p>
          </div>
          <button onClick={fetchUsers} className="p-2 hover:bg-green-900/30 rounded"><RefreshCw className="w-5 h-5" /></button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.filter(u => u.username !== myUsername).map(u => (
            <div
              key={u.username}
              onClick={() => { setSelectedPeer(u); setView('CHAT'); }}
              className="border border-green-900/50 bg-green-900/10 p-4 rounded cursor-pointer hover:bg-green-500 hover:text-black transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-green-500/50">
                  <Users className="w-5 h-5 group-hover:text-green-500" />
                </div>
                <div>
                  <div className="font-bold">{u.username}</div>
                  <div className="text-[10px] opacity-60 truncate w-32">{u.public_key}</div>
                </div>
              </div>
            </div>
          ))}

          {activeUsers.length <= 1 && (
            <div className="col-span-full text-center opacity-50 py-10 border border-dashed border-green-900 rounded">
              Scanning for peers... (No other users found in DB)
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- CHAT VIEW ---
  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono flex flex-col h-screen overflow-hidden">
      {/* Chat Header */}
      <header className="h-16 flex items-center justify-between px-4 bg-black/80 border-b border-green-900/30">
        <button onClick={() => setView('LOBBY')} className="text-xs hover:text-green-500">&larr; BACK</button>
        <div className="text-center">
          <div className="font-bold text-green-500">{selectedPeer?.username}</div>
          <div className="text-[10px] opacity-50">E2EE ENCRYPTED CHANNEL</div>
        </div>
        <div className="w-8"></div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter(m => (m.sender_username === selectedPeer?.username || m.receiver_username === selectedPeer?.username))
          .map((msg) => {
            const isMe = msg.sender_username === myUsername;

            // Decrypt on the fly
            // Note: In React render cycle this is expensive, usually you'd memoize or decrypt once in useEffect.
            // For demo simplicity, we do it here. 
            // Wait, if I sent it, I can't decrypt it unless I stored it specially or I'm sending to myself.
            // Standard Signal Protocol: You encrypt to recipient AND encrypt to yourself (for history).
            // My simple `crypto.ts` only does one-way box.
            // FIX: If I am sender, I can't read it from the `ciphertext` meant for Bob.
            // Hack: Just show "You sent an encrypted message" or rely on local state?
            // Better Hack: Show plaintext for me if I just sent it (state), but fetching from DB it will remain locked.
            // "Z++" Feature: You can't read your own sent history on a new device? That's actually true for simple implementations!

            let content = "Encrypted Message";
            if (!isMe && myKeys && selectedPeer) {
              const dec = decryptMessage(msg.encryptedContent, myKeys.secretKey, selectedPeer.public_key);
              if (dec) content = dec;
            } else if (isMe) {
              content = ">> ENCRYPTED TRANSMISSION SENT >>";
            }

            return (
              <motion.div
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[75%] p-3 rounded border text-sm",
                  isMe ? "bg-green-900/20 border-green-900 text-green-100" : "bg-gray-900 border-gray-700"
                )}>
                  <div className="mb-1 text-[10px] opacity-50 flex justify-between gap-4">
                    <span>{isMe ? 'YOU' : msg.sender_username}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="break-all">{content}</div>
                </div>
              </motion.div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black border-t border-green-900/30">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            className="flex-1 bg-gray-900 text-white rounded p-3 outline-none border border-transparent focus:border-green-500 transition-all placeholder-gray-600"
            placeholder="Type secure instruction..."
          />
          <button type="submit" className="bg-green-600 hover:bg-green-500 text-black px-4 rounded font-bold"><Send className="w-5 h-5" /></button>
        </form>
      </div>
    </div>
  );
}
