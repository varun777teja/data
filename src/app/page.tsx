"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import {
  Home, Search, PlusSquare, Heart, MessageCircle, User,
  MoreHorizontal, Bookmark, Send, Image, X,
  Settings, LogOut, Compass, Film, Smile, Camera, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPage from '@/components/ChatPage';

// --- Types ---
interface UserProfile {
  username: string;
  public_key: string;
  avatar_url?: string;
  bio?: string;
}

interface Post {
  id: string;
  author_username: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface Comment {
  id: string;
  author_username: string;
  content: string;
  created_at: string;
}

export default function SocialMediaApp() {
  // Views - Simple flow: NAME_ENTRY -> FEED
  const [view, setView] = useState<'NAME_ENTRY' | 'FEED' | 'PROFILE' | 'MESSAGES' | 'EXPLORE' | 'CHAT'>('NAME_ENTRY');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<UserProfile | null>(null);

  // User
  const [myUsername, setMyUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  // Stories
  const [stories, setStories] = useState<UserProfile[]>([]);

  // Check if user already logged in
  useEffect(() => {
    const savedUsername = localStorage.getItem('social_username');
    if (savedUsername) {
      setMyUsername(savedUsername);
      setView('FEED');
    }
  }, []);

  // --- FETCH DATA ---
  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsData) {
      const postsWithStats = await Promise.all(postsData.map(async (post) => {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        const { data: myLike } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', post.id)
          .eq('username', myUsername)
          .single();

        return {
          ...post,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: !!myLike
        };
      }));

      setPosts(postsWithStats);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      setUsers(data);
      setStories(data.slice(0, 8));
    }
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  useEffect(() => {
    if (view === 'FEED' && myUsername) {
      fetchPosts();
      fetchUsers();
    }
  }, [view, myUsername]);

  // --- JOIN WITH USERNAME ---
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");

    const name = inputUsername.trim();
    if (!name || name.length < 2) {
      setUsernameError("Username must be at least 2 characters");
      return;
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', name)
      .single();

    if (existingUser) {
      setUsernameError("This username is already taken. Choose another!");
      return;
    }

    // Create new user
    const { error } = await supabase.from('users').insert({
      username: name,
      public_key: `key-${Date.now()}`
    });

    if (error) {
      setUsernameError("Error creating account. Try again.");
      return;
    }

    // Save to localStorage and proceed
    localStorage.setItem('social_username', name);
    setMyUsername(name);
    setView('FEED');
  };

  // --- POSTS ---
  const createPost = async () => {
    if (!newPostContent.trim()) return;

    const { error } = await supabase.from('posts').insert({
      author_username: myUsername,
      content: newPostContent,
      image_url: newPostImage || null
    });

    if (!error) {
      setNewPostContent("");
      setNewPostImage("");
      setShowCreatePost(false);
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await supabase.from('likes').delete()
        .eq('post_id', postId)
        .eq('username', myUsername);
    } else {
      await supabase.from('likes').insert({
        post_id: postId,
        username: myUsername
      });
    }
    fetchPosts();
  };

  const addComment = async (postId: string) => {
    if (!newComment.trim()) return;

    await supabase.from('comments').insert({
      post_id: postId,
      author_username: myUsername,
      content: newComment
    });

    setNewComment("");
    fetchComments(postId);
    fetchPosts();
  };

  const handleLogout = () => {
    localStorage.removeItem('social_username');
    setMyUsername("");
    setInputUsername("");
    setView('NAME_ENTRY');
  };

  // --- NAME ENTRY SCREEN (Simple, No Login) ---
  if (view === 'NAME_ENTRY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to Socially</h1>
            <p className="text-gray-500 text-sm mb-6">Choose a unique username to get started</p>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={e => setInputUsername(e.target.value)}
                  className="input text-center text-lg"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              {usernameError && (
                <p className="text-red-500 text-sm">{usernameError}</p>
              )}

              <button type="submit" className="btn btn-primary w-full py-3 text-base">
                Join Now
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-6">
              Your username must be unique. Once chosen, it cannot be changed.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col p-4">
        {/* Logo */}
        <div className="flex items-center gap-3 p-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">Socially</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          {[
            { icon: Home, label: 'Home', view: 'FEED' },
            { icon: Search, label: 'Explore', view: 'EXPLORE' },
            { icon: Film, label: 'Reels', view: 'FEED' },
            { icon: MessageCircle, label: 'Messages', view: 'MESSAGES' },
            { icon: Heart, label: 'Notifications', view: 'FEED' },
            { icon: PlusSquare, label: 'Create', action: () => setShowCreatePost(true) },
            { icon: User, label: 'Profile', view: 'PROFILE' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => item.action ? item.action() : item.view && setView(item.view as any)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-gray-100 ${view === item.view ? 'font-semibold' : ''
                }`}
            >
              <item.icon className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
              {myUsername[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium">{myUsername}</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
            <button onClick={handleLogout} title="Logout">
              <LogOut className="w-5 h-5 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">Socially</h1>
          <div className="flex items-center gap-4">
            <button className="relative">
              <Heart className="w-6 h-6" />
              <span className="badge">3</span>
            </button>
            <button onClick={() => setView('MESSAGES')}>
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Feed View */}
        {view === 'FEED' && (
          <div className="max-w-xl mx-auto">
            {/* Stories */}
            <div className="bg-white border-b lg:border lg:rounded-xl lg:my-4 p-4">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                {/* Add Story */}
                <button onClick={() => setShowCreatePost(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors">
                    <PlusSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-xs">Your Story</span>
                </button>

                {/* User Stories */}
                {stories.filter(s => s.username !== myUsername).map((user, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="avatar-ring story-ring p-[2px]">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {user.username[0]?.toUpperCase()}
                      </div>
                    </div>
                    <span className="text-xs truncate w-16 text-center">{user.username}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border">
                  <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-medium mb-1">No posts yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Be the first to share something!</p>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="btn btn-primary"
                  >
                    Create Post
                  </button>
                </div>
              ) : (
                posts.map((post) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border rounded-xl overflow-hidden"
                  >
                    {/* Post Header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {post.author_username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{post.author_username}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button className="btn-ghost">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Post Image */}
                    {post.image_url && (
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-full object-cover post-image"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleLike(post.id, post.is_liked)}
                            className={`transition-transform hover:scale-110 ${post.is_liked ? 'like-animation' : ''}`}
                          >
                            <Heart className={`w-7 h-7 ${post.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                          <button onClick={() => { setShowComments(post.id); fetchComments(post.id); }}>
                            <MessageCircle className="w-7 h-7" />
                          </button>
                          <button>
                            <Send className="w-6 h-6" />
                          </button>
                        </div>
                        <button>
                          <Bookmark className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Likes */}
                      <div className="font-semibold mb-1">{post.likes_count} likes</div>

                      {/* Caption */}
                      <div className="mb-2">
                        <span className="font-semibold mr-2">{post.author_username}</span>
                        <span>{post.content}</span>
                      </div>

                      {/* Comments Link */}
                      {post.comments_count > 0 && (
                        <button
                          onClick={() => { setShowComments(post.id); fetchComments(post.id); }}
                          className="text-gray-500 text-sm"
                        >
                          View all {post.comments_count} comments
                        </button>
                      )}
                    </div>

                    {/* Quick Comment */}
                    <div className="border-t px-4 py-3 flex items-center gap-3">
                      <Smile className="w-6 h-6 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 text-sm outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            setNewComment(e.currentTarget.value);
                            addComment(post.id);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button className="text-indigo-500 font-semibold text-sm">Post</button>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </div>
        )}

        {/* Profile View */}
        {view === 'PROFILE' && (
          <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-start gap-8 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {myUsername[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-xl font-medium">{myUsername}</h1>
                    <button className="btn btn-primary py-2 px-4">Edit Profile</button>
                    <button className="btn-ghost p-2"><Settings className="w-5 h-5" /></button>
                  </div>
                  <div className="flex gap-8 mb-4">
                    <div><strong>{posts.filter(p => p.author_username === myUsername).length}</strong> posts</div>
                    <div><strong>0</strong> followers</div>
                    <div><strong>0</strong> following</div>
                  </div>
                  <p className="text-gray-600">Welcome to Socially! Start sharing your moments.</p>
                </div>
              </div>

              {/* User Posts Grid */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-1">
                  {posts.filter(p => p.author_username === myUsername).map(post => (
                    <div key={post.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                      {post.image_url ? (
                        <img src={post.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm p-2 text-center">
                          {post.content.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages View */}
        {view === 'MESSAGES' && (
          <div className="max-w-xl mx-auto p-4">
            <div className="bg-white rounded-xl border p-6 text-center">
              <Lock className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
              <h2 className="text-xl font-bold mb-2">Messages</h2>
              <p className="text-gray-500 mb-4">Chat with other users</p>
              <div className="space-y-2">
                {users.filter(u => u.username !== myUsername).map(user => (
                  <div
                    key={user.username}
                    onClick={() => { setChatWith(user); setView('CHAT'); }}
                    className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">Tap to start chatting</div>
                    </div>
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
                {users.filter(u => u.username !== myUsername).length === 0 && (
                  <p className="text-gray-400 text-sm py-4">No other users yet. Invite friends to join!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat View - Beautiful Nexus Chat UI */}
        {view === 'CHAT' && chatWith && (
          <ChatPage
            myUsername={myUsername}
            chatWith={{ username: chatWith.username }}
            onBack={() => { setChatWith(null); setView('MESSAGES'); }}
          />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav lg:hidden flex justify-around">
        {[
          { icon: Home, view: 'FEED' },
          { icon: Search, view: 'EXPLORE' },
          { icon: PlusSquare, action: () => setShowCreatePost(true) },
          { icon: Film, view: 'FEED' },
          { icon: User, view: 'PROFILE' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => item.action ? item.action() : item.view && setView(item.view as any)}
            className={`p-3 ${view === item.view ? 'nav-active' : ''}`}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </nav>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
            onClick={() => setShowCreatePost(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <button onClick={() => setShowCreatePost(false)}>
                  <X className="w-6 h-6" />
                </button>
                <h2 className="font-semibold">Create Post</h2>
                <button
                  onClick={createPost}
                  className="text-indigo-500 font-semibold"
                >
                  Share
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {myUsername[0]?.toUpperCase()}
                  </div>
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="flex-1 resize-none outline-none text-lg min-h-[120px]"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    value={newPostImage}
                    onChange={e => setNewPostImage(e.target.value)}
                    placeholder="Image URL (optional)"
                    className="input"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                    <Image className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                    <Camera className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Camera</span>
                  </button>
                  <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                    <Smile className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm">Emoji</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 modal-overlay flex items-end lg:items-center justify-center"
            onClick={() => setShowComments(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 border-b text-center relative">
                <h2 className="font-semibold">Comments</h2>
                <button
                  onClick={() => setShowComments(null)}
                  className="absolute right-4 top-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[50vh] p-4 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {comment.author_username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div>
                          <span className="font-semibold text-sm">{comment.author_username}</span>
                          <span className="text-sm ml-2">{comment.content}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {myUsername[0]?.toUpperCase()}
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && showComments) {
                      addComment(showComments);
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 outline-none text-sm"
                />
                <button
                  onClick={() => showComments && addComment(showComments)}
                  className="text-indigo-500 font-semibold text-sm"
                >
                  Post
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
