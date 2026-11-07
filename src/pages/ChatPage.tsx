import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Conversation, Message, PlasticReport } from '../types';
import { 
  MessageSquare, 
  Send, 
  User, 
  Building2, 
  FileText, 
  Clock, 
  AlertCircle, 
  Loader2,
  ChevronLeft,
  Search
} from 'lucide-react';

interface ChatPageProps {
  initialReportForChat?: PlasticReport | null;
  initialConversationId?: string | null;
  onClearInitialReport?: () => void;
  onOpenReport?: (reportId: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  initialReportForChat,
  initialConversationId,
  onClearInitialReport,
  onOpenReport
}) => {
  const { currentUser, userProfile, userRole, isAdmin } = useAuth();
  const { t, language } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Listen to active conversations for this user
  useEffect(() => {
    if (!currentUser) {
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);

    // Listen to conversations collection in real-time
    const unsub = onSnapshot(
      collection(db, 'conversations'),
      (snapshot) => {
        const convs: Conversation[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const pIds: string[] = data.participantIds || data.participants || [];
          const isParticipant =
            isAdmin ||
            pIds.includes(currentUser.uid) ||
            data.individualId === currentUser.uid ||
            data.orgId === currentUser.uid;

          if (isParticipant) {
            convs.push({
              id: d.id,
              ...data,
              participantIds: pIds.length > 0 ? pIds : [data.individualId, data.orgId].filter(Boolean)
            } as Conversation);
          }
        });

        // Sort by lastMessageAt descending
        convs.sort((a, b) => {
          const timeA = new Date(a.lastMessageAt || a.lastMessageTimestamp || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageAt || b.lastMessageTimestamp || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setConversations(convs);
        setLoadingConversations(false);

        if (initialConversationId) {
          const matched = convs.find(c => c.id === initialConversationId);
          if (matched) {
            setActiveConversation(matched);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
        setLoadingConversations(false);
      }
    );

    return () => unsub();
  }, [currentUser, isAdmin, initialConversationId]);

  // 2. Handle starting a chat from a specific report
  useEffect(() => {
    if (!initialReportForChat || !currentUser) return;

    const startOrOpenChat = async () => {
      try {
        const report = initialReportForChat;
        const reportSummary = `${report.quantity} ${report.unit} ${report.plasticType} (${report.location})`;

        // Check if a conversation between this org and individual for this report already exists
        const convQuery = query(
          collection(db, 'conversations'),
          where('reportId', '==', report.id)
        );
        const existingDocs = await getDocs(convQuery);
        const matchedDoc = existingDocs.docs.find((d) => d.data().orgId === currentUser.uid);

        if (matchedDoc) {
          setActiveConversation({ id: matchedDoc.id, ...matchedDoc.data() } as Conversation);
        } else {
          // Create new conversation
          const newConvData = {
            reportId: report.id,
            reportSummary,
            individualId: report.creatorId,
            individualName: report.creatorName || 'Individual',
            orgId: currentUser.uid,
            orgName: userProfile?.name || 'Organization',
            participantIds: [report.creatorId, currentUser.uid],
            participants: [report.creatorId, currentUser.uid],
            lastMessage: `${userProfile?.name || 'An organization'} initiated a conversation.`,
            lastMessageAt: new Date().toISOString(),
            lastSenderId: currentUser.uid,
            createdAt: new Date().toISOString()
          };

          const docRef = await addDoc(collection(db, 'conversations'), newConvData);
          
          // Also track org in report's interestedOrgIds
          try {
            const reportRef = doc(db, 'reports', report.id);
            const currentInterested = report.interestedOrgIds || [];
            if (!currentInterested.includes(currentUser.uid)) {
              await updateDoc(reportRef, {
                interestedOrgIds: [...currentInterested, currentUser.uid],
                updatedAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.warn('Could not update interestedOrgIds on report:', e);
          }

          setActiveConversation({ id: docRef.id, ...newConvData } as Conversation);
        }
      } catch (err) {
        console.error('Error starting conversation:', err);
      } finally {
        if (onClearInitialReport) onClearInitialReport();
      }
    };

    startOrOpenChat();
  }, [initialReportForChat, currentUser, userProfile, onClearInitialReport]);

  // 3. Listen to messages for the active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'conversations', activeConversation.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() } as Message);
        });
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error('Error loading messages:', error);
        setLoadingMessages(false);
      }
    );

    return () => unsub();
  }, [activeConversation]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation || !currentUser) return;

    const text = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      const messagesRef = collection(db, 'conversations', activeConversation.id, 'messages');
      const nowIso = new Date().toISOString();

      await addDoc(messagesRef, {
        conversationId: activeConversation.id,
        senderId: currentUser.uid,
        senderName: userProfile?.name || currentUser.displayName || 'User',
        senderRole: userRole || 'individual',
        text,
        createdAt: nowIso
      });

      // Update conversation last message summary
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: text,
        lastMessageAt: nowIso,
        lastSenderId: currentUser.uid
      });
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.individualName?.toLowerCase().includes(searchLower) ||
      c.orgName?.toLowerCase().includes(searchLower) ||
      c.reportSummary?.toLowerCase().includes(searchLower) ||
      c.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  const formatMessageTime = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div id="page-chat" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-emerald-700" />
          <span>{t('chatTitle')}</span>
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          {t('chatSubtitle')}
        </p>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden h-[75vh] flex flex-col md:flex-row">
        
        {/* Left / Top Sidebar: Conversation Threads */}
        <div 
          className={`w-full md:w-80 lg:w-96 border-r rtl:border-r-0 rtl:border-l border-stone-200 flex flex-col bg-stone-50/50 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-stone-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-stone-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>{t('loading')}</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-semibold text-stone-700">{t('noConversations')}</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  {t('noConversationsDesc')}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const otherPartyName = currentUser?.uid === conv.individualId ? conv.orgName : conv.individualName;
                const isOtherOrg = currentUser?.uid === conv.individualId;

                return (
                  <div
                    key={conv.id}
                    id={`conversation-item-${conv.id}`}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-600' : 'hover:bg-stone-100/70'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {isOtherOrg ? <Building2 className="w-4 h-4 text-emerald-700" /> : <User className="w-4 h-4 text-stone-600" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {otherPartyName}
                        </h4>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formatMessageTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      {/* Report Tag */}
                      {conv.reportSummary && (
                        <p className="text-[11px] text-emerald-700 font-medium truncate flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span>{conv.reportSummary}</span>
                        </p>
                      )}

                      {/* Last message */}
                      <p className="text-xs text-stone-500 truncate mt-1">
                        {conv.lastMessage || '...'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right / Main Pane: Active Message Thread */}
        <div className={`flex-1 flex flex-col bg-white ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    id="btn-back-to-conversations"
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-1.5 text-stone-500 hover:text-stone-800 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {currentUser?.uid === activeConversation.individualId ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {currentUser?.uid === activeConversation.individualId
                        ? activeConversation.orgName
                        : activeConversation.individualName}
                    </h3>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span>{t('aboutReport')}</span>
                      <span className="font-semibold text-emerald-700">{activeConversation.reportSummary}</span>
                    </p>
                  </div>
                </div>

                {onOpenReport && activeConversation.reportId && (
                  <button
                    onClick={() => onOpenReport(activeConversation.reportId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">{t('viewDetails')}</span>
                  </button>
                )}
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/30">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-xs text-stone-400">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                    <MessageSquare className="w-8 h-8 mb-2 text-stone-300" />
                    <p className="text-xs font-semibold text-stone-600">
                      {language === 'ar' ? 'لا توجد رسائل سابقة. ابدأ المحادثة الآن!' : 'No messages yet. Send a message to coordinate pickup!'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5 px-1">
                          <span className="font-semibold text-stone-600">{msg.senderName}</span>
                          <span>•</span>
                          <span>{formatMessageTime(msg.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-emerald-700 text-white rounded-br-xs rtl:rounded-br-2xl rtl:rounded-bl-xs'
                              : 'bg-white border border-stone-200 text-stone-800 shadow-2xs rounded-bl-xs rtl:rounded-bl-2xl rtl:rounded-br-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-200 bg-white flex items-center gap-2">
                <input
                  id="input-chat-message"
                  type="text"
                  placeholder={t('typeMessagePlaceholder')}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                  disabled={sending}
                />
                <button
                  id="btn-send-chat-message"
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors disabled:opacity-40"
                  aria-label={t('send')}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 rtl:-scale-x-100" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-700 mb-1">
                {t('selectConversation')}
              </h3>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                {t('noConversationsDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
