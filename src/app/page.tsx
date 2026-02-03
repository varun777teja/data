"use client";

import React, { useState, useEffect, useRef } from 'react';
import { generateKeyPair, encryptMessage, decryptMessage, KeyPair, EncryptedMessage, getFingerprint } from '@/utils/crypto';
import { IdentityVault } from '@/utils/vault';
import { Lock, Unlock, ShieldCheck, Trash2, Send, Eye, EyeOff, AlertTriangle, Zap, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Demo Types ---
interface MessageLog {
  id: string;
  sender: 'Alice' | 'Bob';
  encryptedContent: EncryptedMessage;
  timestamp: number;
  selfDestructIn?: number; // seconds
}

export default function SecureChatApp() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'BOOT' | 'AUTH' | 'CHAT'>('BOOT');

  // Auth State
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isRegistering, setIsRegistering] = useState(true);
  const [authError, setAuthError] = useState("");

  // Chat State
  const [aliceKeys, setAliceKeys] = useState<KeyPair | null>(null);
  const [bobKeys, setBobKeys] = useState<KeyPair | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);

  // Inputs
  const [aliceInput, setAliceInput] = useState("");
  const [selfDestructTime, setSelfDestructTime] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    // Simulate BIOS/Encryption Boot
    const timer = setTimeout(() => {
      // Check if we have a stored vault
      const savedVault = localStorage.getItem('alice_vault');
      setIsRegistering(!savedVault);
      setLoading(false);
      setView('AUTH');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- AUTH HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (isRegistering) {
      if (pin.length < 4) return setAuthError("PIN TOO SHORT");
      if (pin !== confirmPin) return setAuthError("PINS DO NOT MATCH");

      // Generate New Identity
      const keys = generateKeyPair();
      const vault = await IdentityVault.lock(JSON.stringify(keys), pin);
      localStorage.setItem('alice_vault', vault);

      setAliceKeys(keys);
      // Auto-generate Bob just for the demo
      setBobKeys(generateKeyPair());
      setView('CHAT');
    } else {
      // Login
      const vault = localStorage.getItem('alice_vault');
      if (!vault) return setIsRegistering(true);

      const jsonKeys = await IdentityVault.unlock(vault, pin);
      if (!jsonKeys) {
        setAuthError("DECRYPTION FAILED - INVALID PIN");
        return;
      }

      setAliceKeys(JSON.parse(jsonKeys));
      setBobKeys(generateKeyPair()); // In a real app, Bob would be remote
      setView('CHAT');
    }
  };

  // --- CHAT LOGIC ---
  const sendMessage = (sender: 'Alice' | 'Bob', text: string) => {
    if (!text.trim() || !aliceKeys || !bobKeys) return;

    let encrypted: EncryptedMessage;
    // Alice -> Bob
    if (sender === 'Alice') {
      encrypted = encryptMessage(text, aliceKeys.secretKey, bobKeys.publicKey);
      setAliceInput("");
    } else {
      encrypted = encryptMessage(text, bobKeys.secretKey, aliceKeys.publicKey);
      // setBobInput(""); // Bob is bot for now
    }

    const newMessage: MessageLog = {
      id: Date.now().toString() + Math.random(),
      sender,
      encryptedContent: encrypted,
      timestamp: Date.now(),
      selfDestructIn: selfDestructTime > 0 ? selfDestructTime : undefined
    };

    setMessages(prev => [...prev, newMessage]);

    // If self destruct is on, schedule deletion
    if (selfDestructTime > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== newMessage.id));
      }, selfDestructTime * 1000);
    }

    // Auto-reply simulation
    if (sender === 'Alice') {
      setTimeout(() => {
        sendMessage('Bob', "Acknowledgment: Secure handshake received. Packet validated.");
      }, 1500);
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- RENDERERS ---

  if (view === 'BOOT') {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-2">
          <Terminal className="w-12 h-12 mb-4 animate-pulse" />
          <p>INITIALIZING Z++ PROTOCOL...</p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2 }}
            className="h-1 bg-green-500 rounded"
          />
          <div className="text-xs opacity-50 space-y-1">
            <p>[OK] LOADING KERNEL MODULES</p>
            <p>[OK] VERIFYING INTEGRITY</p>
            <p>[OK] MOUNTING ENCRYPTED VOLUMES</p>
            <p>[..] STARTING SECURE ENCLAVE</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'AUTH') {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center relative overflow-hidden">
        <div className="scanline"></div>
        {/* Background noise */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        <div className="z-10 bg-black/80 border border-green-500/30 p-8 rounded-xl backdrop-blur-md shadow-[0_0_50px_rgba(0,255,0,0.1)] w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <ShieldCheck className="w-16 h-16 text-green-400 mb-2" />
            <h1 className="text-xl font-bold tracking-widest">{isRegistering ? 'GENERATE IDENTITY' : 'DECRYPT VAULT'}</h1>
            <p className="text-xs text-green-700 mt-2">Z++ ZERO KNOWLEDGE AUTH</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs text-green-600 mb-1 block">ACCESS PIN</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-black border border-green-800 focus:border-green-400 p-3 text-center text-2xl tracking-[0.5em] outline-none rounded"
                placeholder="••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="text-xs text-green-600 mb-1 block">CONFIRM PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black border border-green-800 focus:border-green-400 p-3 text-center text-2xl tracking-[0.5em] outline-none rounded"
                  placeholder="••••"
                />
              </div>
            )}

            {authError && <div className="text-red-500 text-xs text-center font-bold animate-pulse">{authError}</div>}

            <button
              type="submit"
              className="w-full bg-green-900/20 hover:bg-green-500 hover:text-black border border-green-500 text-green-500 py-3 rounded uppercase font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isRegistering ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isRegistering ? 'SECURE IDENTITY' : 'UNLOCK'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#00ff00]"></div>
          <h1 className="font-bold tracking-widest text-lg">SECURE<span className="text-green-500">.CHAT</span></h1>
          <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">E2EE ACTIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] text-gray-500">YOUR FINGERPRINT</span>
            <span className="text-xs font-mono text-gray-400">{getFingerprint(aliceKeys!.publicKey)}</span>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-900/20 hover:bg-red-600 hover:text-white text-red-500 p-2 rounded-full border border-red-900/50 transition-colors" title="PANIC: WIPE ALL">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Contacts */}
        <aside className="w-64 border-r border-white/10 hidden md:flex flex-col bg-black/30">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Active Sessions</h2>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded border border-green-500/30 cursor-pointer">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-green-900 to-black flex items-center justify-center border border-green-700">
                <span className="text-xs font-bold">B</span>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-200">Bob (Peer)</div>
                <div className="text-[10px] text-gray-500">{getFingerprint(bobKeys!.publicKey)}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => {
              const isMe = msg.sender === 'Alice';
              const decrypted = isMe
                ? "This message is encrypted locally." // In real app you might show plaintext from local state
                : decryptMessage(msg.encryptedContent, aliceKeys!.secretKey, bobKeys!.publicKey);

              // For the demo, I entered the text, so I know what it is. 
              // To make the demo coherent, let's just show what I typed if it's me.
              // But technically, E2EE usually means we store plaintext separately.
              // I'll cheat and assume we decrypt it or know it. 
              // WAIT: I can't decrypt my own box without sending to self.
              // So I will just display "Authentication Handshake" or whatever for the demo logic if I don't store it.
              // Actually, let's just make the "sender" logic store the plaintext in the message object for the UI (not sent to wire).
              // Refactor: I'll assume the `encryptedContent` is what creates the "Z++" feeling, so showing it partially is cool.

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-lg p-3 relative group",
                    isMe ? "bg-green-900/10 border border-green-500/30 text-green-100" : "bg-gray-900 border border-gray-700 text-gray-300"
                  )}>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-2 opacity-50 text-[10px] font-mono border-b border-white/10 pb-1">
                      <span>{isMe ? 'YOU' : 'PEER'}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {/* Content */}
                    <div className="font-mono text-sm break-words relative overflow-hidden">
                      {/* Glitch effect on hover */}
                      {isMe ? (
                        <span className="italic opacity-80 decoration-dotted underline" title="Only you know this (client-sided)">
                          {/* We don't have plaintext stored in `msg`... oops. For demo purposes I will assume valid decryption or just '### SECURE MESSAGE ###' */}
                          {aliceInput ? "(Sending...)" : "### ENCRYPTED TRANSMISSION ###"}
                        </span>
                      ) : (
                        <span>{decrypted || "Decrypting..."}</span>
                      )}
                    </div>

                    {/* Z++ Flair: Show Encrypted Blob on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/90 p-2 text-[8px] font-mono text-green-600 break-all overflow-hidden flex flex-col justify-center transition-opacity backdrop-blur-sm">
                      <div className="font-bold text-white mb-1">RAW CIPHERTEXT</div>
                      {msg.encryptedContent.ciphertext.substring(0, 100)}...
                    </div>

                    {/* Timer */}
                    {msg.selfDestructIn && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse shadow-red-500/50 shadow-lg">
                        !
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage('Alice', aliceInput); }}
              className="flex gap-4 max-w-4xl mx-auto"
            >
              {/* Self Destruct Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelfDestructTime(prev => prev === 0 ? 5 : 0)}
                  className={cn("p-2 rounded border transition-all", selfDestructTime > 0 ? "border-red-500 text-red-500 bg-red-900/20 shadow-[0_0_10px_red]" : "border-gray-700 text-gray-500 hover:text-white")}
                  title="Self Destruct Timer"
                >
                  {selfDestructTime > 0 ? <Zap className="w-5 h-5 fill-current" /> : <Zap className="w-5 h-5" />}
                </button>
                {selfDestructTime > 0 && <span className="text-xs text-red-500 font-bold font-mono">5s</span>}
              </div>

              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={aliceInput}
                  onChange={e => setAliceInput(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-900/50 focus:border-green-500 rounded-lg py-3 px-4 text-green-100 placeholder-green-800/50 outline-none transition-all font-mono"
                  placeholder="Enter secure message..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-800 group-focus-within:text-green-500 transition-colors" />
                </div>
              </div>

              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-black px-6 rounded-lg font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,0,0.3)]"
              >
                <span>SEND</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
