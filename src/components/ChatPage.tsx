"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Message {
    id: string;
    sender: string;
    content: string;
    type: 'text' | 'file' | 'link';
    file_name?: string;
    file_size?: string;
    timestamp: Date;
    is_sent: boolean;
    is_read: boolean;
}

interface ChatPageProps {
    myUsername: string;
    chatWith: {
        username: string;
        avatar?: string;
    };
    onBack: () => void;
}

export default function ChatPage({ myUsername, chatWith, onBack }: ChatPageProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: chatWith.username,
            content: `Hey ${myUsername}! How are you doing today?`,
            type: 'text',
            timestamp: new Date(Date.now() - 300000),
            is_sent: false,
            is_read: true
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [showAttachment, setShowAttachment] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [linkInput, setLinkInput] = useState('');

    const chatWindowRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTo({
                top: chatWindowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = () => {
        const text = inputText.trim();
        if (!text && !currentFile) return;

        const newMessages: Message[] = [];

        if (currentFile) {
            newMessages.push({
                id: `file-${Date.now()}`,
                sender: myUsername,
                content: '',
                type: 'file',
                file_name: currentFile.name,
                file_size: `${(currentFile.size / 1024).toFixed(1)} KB`,
                timestamp: new Date(),
                is_sent: true,
                is_read: false
            });
            setCurrentFile(null);
            setShowAttachment(false);
        }

        if (text) {
            newMessages.push({
                id: `msg-${Date.now()}`,
                sender: myUsername,
                content: text,
                type: text.match(/https?:\/\/[^\s]+/) ? 'link' : 'text',
                timestamp: new Date(),
                is_sent: true,
                is_read: false
            });
        }

        setMessages(prev => [...prev, ...newMessages]);
        setInputText('');

        // Simulate read receipt
        setTimeout(() => {
            setMessages(prev => prev.map(msg =>
                newMessages.find(m => m.id === msg.id) ? { ...msg, is_read: true } : msg
            ));
        }, 2000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCurrentFile(file);
            setShowAttachment(true);
        }
        e.target.value = '';
    };

    const sendLink = () => {
        if (linkInput.trim()) {
            setInputText(linkInput);
            setShowLinkModal(false);
            setLinkInput('');
            setTimeout(() => sendMessage(), 100);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getFileIcon = (fileName?: string) => {
        if (!fileName) return 'fa-file-alt';
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'fa-image';
        if (fileName.match(/\.pdf$/i)) return 'fa-file-pdf';
        if (fileName.match(/\.(doc|docx)$/i)) return 'fa-file-word';
        return 'fa-file-alt';
    };

    // Gradient style for sent messages
    const sentMsgStyle = {
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    };

    return (
        <div className="relative overflow-hidden h-screen flex flex-col max-w-[1200px] mx-auto bg-white" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.03)' }}>

            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="md:hidden p-2 text-slate-400 -ml-2 hover:text-slate-600">
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <div className="relative">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
                            {chatWith.username[0]?.toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 leading-none mb-1">{chatWith.username}</h2>
                        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Active Now</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-3">
                    <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <i className="fas fa-phone"></i>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <i className="fas fa-video"></i>
                    </button>
                    <div className="w-px h-6 bg-slate-100 mx-1"></div>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
                    >
                        <i className="fas fa-circle-info"></i>
                    </button>
                </div>
            </header>

            {/* Message History */}
            <div
                ref={chatWindowRef}
                className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-6 bg-slate-50"
                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
            >
                {/* Date Indicator */}
                <div className="flex justify-center my-4">
                    <span className="px-4 py-1.5 bg-white/80 backdrop-blur-sm text-slate-400 text-[11px] font-bold uppercase rounded-full shadow-sm border border-slate-100 tracking-widest">
                        Today
                    </span>
                </div>

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.is_sent ? 'flex-col items-end self-end' : 'items-start gap-3'} max-w-[85%] md:max-w-[70%]`}
                        style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
                    >
                        {/* Avatar for received messages */}
                        {!msg.is_sent && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1">
                                {chatWith.username[0]?.toUpperCase()}
                            </div>
                        )}

                        <div className={`flex flex-col ${msg.is_sent ? 'items-end' : ''} gap-1.5`}>
                            {/* File Message */}
                            {msg.type === 'file' && (
                                <div className={`${msg.is_sent
                                    ? 'bg-indigo-50/50 border-indigo-100 rounded-br-none'
                                    : 'bg-white border-slate-100 rounded-tl-none'
                                    } p-3 pr-6 rounded-2xl shadow-sm border flex items-center gap-4 group cursor-pointer hover:border-indigo-200 transition-colors mb-1`}>
                                    <div className={`w-10 h-10 ${msg.is_sent ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-500'} flex items-center justify-center rounded-xl text-lg shrink-0`}>
                                        <i className={`fas ${getFileIcon(msg.file_name)}`}></i>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{msg.file_name}</p>
                                        <p className={`text-[10px] ${msg.is_sent ? 'text-indigo-400' : 'text-slate-400'} font-bold uppercase tracking-tight`}>
                                            {msg.file_size} • {msg.is_sent ? 'Sent' : 'Received'}
                                        </p>
                                    </div>
                                    <i className="fas fa-download text-slate-300 group-hover:text-indigo-500 transition-colors ml-auto"></i>
                                </div>
                            )}

                            {/* Text/Link Message */}
                            {(msg.type === 'text' || msg.type === 'link') && msg.content && (
                                <div
                                    className={`p-4 rounded-2xl text-[15px] leading-relaxed ${msg.is_sent
                                            ? 'text-white rounded-tr-none shadow-lg shadow-indigo-100'
                                            : 'bg-white rounded-tl-none shadow-sm border border-slate-100 text-slate-700'
                                        }`}
                                    style={msg.is_sent ? sentMsgStyle : undefined}
                                >
                                    {msg.content}
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className={`flex items-center gap-1.5 ${msg.is_sent ? 'mr-1' : 'ml-1'}`}>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                    {formatTime(msg.timestamp)}
                                </span>
                                {msg.is_sent && (
                                    <i className={`fas ${msg.is_read ? 'fa-check-double text-indigo-500' : 'fa-check text-slate-300'} text-[10px]`}></i>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Attachment Preview */}
            {showAttachment && currentFile && (
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-4" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
                    <div className="relative">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 text-xl">
                            <i className={`fas ${getFileIcon(currentFile.name)}`}></i>
                        </div>
                        <button
                            onClick={() => { setCurrentFile(null); setShowAttachment(false); }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-red-500 transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{currentFile.name}</p>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-indigo-500 h-full w-full rounded-full"></div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] text-green-500 font-black uppercase tracking-widest">Ready</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {(currentFile.size / 1024).toFixed(1)} KB
                        </span>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <footer className="p-6 md:p-8 bg-white border-t border-slate-100">
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-[24px] border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-500 transition-all">

                    <div className="flex items-center">
                        <label className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer rounded-full hover:bg-indigo-50 transition-all">
                            <i className="fas fa-paperclip text-lg"></i>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                        <button
                            onClick={() => setShowLinkModal(true)}
                            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all"
                        >
                            <i className="fas fa-link text-lg"></i>
                        </button>
                    </div>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={`Message ${chatWith.username}...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 font-medium px-2 py-3 outline-none placeholder:text-slate-400"
                    />

                    <div className="flex items-center gap-2 pr-1">
                        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-all">
                            <i className="fas fa-face-smile text-xl"></i>
                        </button>
                        <button
                            onClick={sendMessage}
                            className="w-12 h-12 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                            style={sentMsgStyle}
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </footer>

            {/* Contact Details Side Drawer */}
            <aside
                className={`absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-100 transition-transform duration-300 z-30 shadow-2xl flex flex-col ${showDetails ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Chat Info</h3>
                    <button onClick={() => setShowDetails(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-800">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mb-4 border border-slate-100 shadow-sm">
                            {chatWith.username[0]?.toUpperCase()}
                        </div>
                        <h4 className="text-xl font-bold text-slate-800">{chatWith.username}</h4>
                        <p className="text-sm text-slate-500 font-medium mt-1">Member</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">About Contact</h5>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <i className="fas fa-user w-4 text-slate-400"></i>
                                    <span>@{chatWith.username}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <i className="fas fa-shield-halved w-4 text-slate-400"></i>
                                    <span>End-to-end encrypted</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shared Media</h5>
                                <button className="text-xs font-bold text-indigo-500">View All</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <i className="fas fa-image"></i>
                                </div>
                                <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <i className="fas fa-file"></i>
                                </div>
                                <div className="aspect-square bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600">+0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Link Share Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}></div>
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full relative z-10 shadow-2xl" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
                            <i className="fas fa-link"></i>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 text-center mb-2 leading-tight">Share a Link</h3>
                        <p className="text-sm text-slate-500 text-center mb-8">Drop a URL here to share it instantly with {chatWith.username}.</p>
                        <div className="relative mb-8">
                            <input
                                type="text"
                                value={linkInput}
                                onChange={(e) => setLinkInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendLink()}
                                placeholder="https://..."
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-sm font-medium transition-all"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendLink}
                                className="flex-1 py-4 bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-600 hover:-translate-y-0.5 transition-all"
                            >
                                Share Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animation styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
        </div>
    );
}
