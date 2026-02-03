"use client";

import React, { useState, useEffect, useRef } from 'react';
import { generateKeyPair, encryptMessage, decryptMessage, KeyPair, EncryptedMessage, getFingerprint } from '@/utils/crypto';

// Types for the demo
interface MessageLog {
  id: string;
  sender: 'Alice' | 'Bob';
  encryptedContent: EncryptedMessage;
  timestamp: number;
}

export default function SecureChatPage() {
  // We simulate two users: Alice (You) and Bob (The Peer) running locally to demo the encryption.
  const [aliceKeys, setAliceKeys] = useState<KeyPair | null>(null);
  const [bobKeys, setBobKeys] = useState<KeyPair | null>(null);

  const [aliceInput, setAliceInput] = useState("");
  const [bobInput, setBobInput] = useState("");

  const [messages, setMessages] = useState<MessageLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Keys
  useEffect(() => {
    setAliceKeys(generateKeyPair());
    setBobKeys(generateKeyPair());
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (sender: 'Alice' | 'Bob', text: string) => {
    if (!text.trim() || !aliceKeys || !bobKeys) return;

    let encrypted: EncryptedMessage;

    if (sender === 'Alice') {
      // Alice encrypts for Bob
      encrypted = encryptMessage(text, aliceKeys.secretKey, bobKeys.publicKey);
      setAliceInput("");
    } else {
      // Bob encrypts for Alice
      encrypted = encryptMessage(text, bobKeys.secretKey, aliceKeys.publicKey);
      setBobInput("");
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      sender,
      encryptedContent: encrypted,
      timestamp: Date.now()
    }]);
  };

  if (!aliceKeys || !bobKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary">
        <div className="animate-pulse">INITIALIZING SECURE ENCLAVE...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4 max-w-7xl mx-auto">
      <div className="scanline"></div>

      {/* Header */}
      <header className="flex justify-between items-center border-b border-surface-border pb-4 mb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary glitch-text">SECURE.CHAT <span className="text-xs text-foreground bg-primary-dim px-2 py-0.5 rounded">E2EE ACTIVE</span></h1>
        <div className="text-xs text-white/50 font-mono">
          SESSION ID: {getFingerprint(aliceKeys.publicKey)}::{getFingerprint(bobKeys.publicKey)}
        </div>
      </header>

      {/* Main Grid: User A | Network | User B */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 h-[600px]">

        {/* === ALICE'S VIEW === */}
        <section className="glass-panel p-4 flex flex-col h-full border-primary/30 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
          <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-2">
            <h2 className="text-lg font-bold text-primary">USER_A (YOU)</h2>
            <span className="text-[10px] text-gray-500 font-mono">{getFingerprint(aliceKeys.publicKey)}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg) => {
              const isInfo = msg.sender === 'Alice';
              // Alice can decrypt messages from Bob (using her secret + Bob's public)
              // And she knows what she sent.
              let content = "";
              if (msg.sender === 'Alice') {
                // We decrypt our own message just to prove it works, or we could store plaintext locally. 
                // But for E2EE purity, let's decrypt the sent blob if we wanted, or just trust the input.
                // Actually, crypto.ts encrypts. We can't easily decrypt our own box unless we encrypt to self.
                // For this "Chat View", we usually show the plaintext we just typed. 
                // But we only have the encrypted blob in state! 
                // We can't decrypt what we sent to Bob (Curve25519 Box property).
                // So we will just show "You sent an encrypted message" or we'd need to store plaintext in state.
                // *Correction*: In a real app, you store the plaintext in local history.
                content = "(Encrypted Message Sent)";
              } else {
                // Decrypt Bob's message
                const decrypted = decryptMessage(msg.encryptedContent, aliceKeys.secretKey, bobKeys.publicKey);
                content = decrypted || "DECRYPTION FAILED";
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isInfo ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-2 rounded border ${isInfo ? 'border-primary text-primary bg-primary/10' : 'border-gray-700 bg-surface'}`}>
                    {/* If it's Alice sending, ideally we show what she typed. For this demo, I'll cheat and just show "Encrypted Payload" unless I modify state to store plaintext. 
                        Actually, let's make it more visual: Show the 'Network' view is key. 
                        Let's just decrypt Bob's messages here.
                    */}
                    {msg.sender === 'Alice' ? <span className="italic opacity-50">Ciphertext delivered to network...</span> : content}
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef}></div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage('Alice', aliceInput); }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              value={aliceInput}
              onChange={e => setAliceInput(e.target.value)}
              className="input-secure flex-1"
              placeholder="Type secret message..."
            />
            <button type="submit" className="btn-primary">&gt;</button>
          </form>
        </section>


        {/* === NETWORK/HACKER VIEW (The Man in the Middle) === */}
        <section className="glass-panel p-4 flex flex-col h-full bg-black border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('/grid.png')] opacity-10 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-2 z-10">
            <h2 className="text-lg font-bold text-red-500">NETWORK INTERCEPT</h2>
            <span className="text-[10px] text-red-900 animate-pulse">MONITORING</span>
          </div>

          <div className="flex-1 overflow-hidden font-mono text-xs text-green-900 z-10 flex flex-col-reverse">
            {/* We show the raw encrypted blobs passing through */}
            {messages.slice().reverse().map((msg) => (
              <div key={msg.id} className="mb-4 break-all border-b border-gray-900 pb-2">
                <div className="text-gray-500 mb-1">Packet ID: {msg.id.split('.')[0]}</div>
                <div className="text-yellow-700/50">NONCE: {msg.encryptedContent.nonce}</div>
                <div className="text-red-500/80">PAYLOAD: {msg.encryptedContent.ciphertext}</div>
              </div>
            ))}
          </div>
        </section>


        {/* === BOB'S VIEW === */}
        <section className="glass-panel p-4 flex flex-col h-full border-blue-500/30 shadow-[0_0_20px_rgba(0,184,255,0.1)]">
          <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-2">
            <h2 className="text-lg font-bold text-secondary">USER_B (PEER)</h2>
            <span className="text-[10px] text-gray-500 font-mono">{getFingerprint(bobKeys.publicKey)}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg) => {
              // Bob sent it?
              if (msg.sender === 'Bob') {
                return (
                  <div key={msg.id} className="flex flex-col items-end">
                    <div className="max-w-[80%] p-2 rounded border border-secondary text-secondary bg-secondary/10">
                      <span className="italic opacity-50">Ciphertext delivered to network...</span>
                    </div>
                  </div>
                )
              } else {
                // Alice sent it, Bob decrypts
                const decrypted = decryptMessage(msg.encryptedContent, bobKeys.secretKey, aliceKeys.publicKey);
                return (
                  <div key={msg.id} className="flex flex-col items-start">
                    <div className="max-w-[80%] p-2 rounded border border-gray-700 bg-surface">
                      {decrypted || "DECRYPTION FAILED"}
                    </div>
                  </div>
                )
              }
            })}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage('Bob', bobInput); }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              value={bobInput}
              onChange={e => setBobInput(e.target.value)}
              className="input-secure flex-1 border-secondary text-secondary"
              placeholder="Reply securely..."
            />
            <button type="submit" className="btn-primary border-secondary text-secondary hover:shadow-[0_0_15px_#00b8ff] hover:bg-secondary">&gt;</button>
          </form>
        </section>

      </div>

      <footer className="text-center text-[10px] text-gray-600 mt-4">
        SECURE CHAT PROTOCOL v1.0 // ENCRYPTION: CRV25519-XSALSA20-POLY1305 // NO LOGS KEPT
      </footer>
    </main>
  );
}
