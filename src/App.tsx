import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  addDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { deleteReportPermanently } from './lib/deletion';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlasticReport, OrganizationNeedPost } from './types';

// Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ReportModal } from './components/ReportModal';
import { ReportDetailModal } from './components/ReportDetailModal';
import { PostNeedModal } from './components/PostNeedModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { QRCodeModal } from './components/QRCodeModal';
import { ConnectWithUsSection } from './components/ConnectWithUsSection';

// Pages
import { HomePage } from './pages/HomePage';
import { ReportsFeedPage } from './pages/ReportsFeedPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { OrganizationNeedsPage } from './pages/OrganizationNeedsPage';
import { CollectionRoutesPage } from './pages/CollectionRoutesPage';
import { ImpactDashboardPage } from './pages/ImpactDashboardPage';
import { EarthIntelligencePage } from './pages/EarthIntelligencePage';

const AppContent: React.FC = () => {
  const { currentUser, userProfile, userRole, isIndividual, isOrganization, isAdmin } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Shared Global Data Streams
  const [allReports, setAllReports] = useState<PlasticReport[]>([]);
  const [organizationPosts, setOrganizationPosts] = useState<OrganizationNeedPost[]>([]);

  // Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportForEdit, setSelectedReportForEdit] = useState<PlasticReport | null>(null);
  
  const [isPostNeedModalOpen, setIsPostNeedModalOpen] = useState(false);
  const [selectedNeedPostForEdit, setSelectedNeedPostForEdit] = useState<OrganizationNeedPost | null>(null);
  
  const [selectedReportForDetails, setSelectedReportForDetails] = useState<PlasticReport | null>(null);
  const [selectedReportForDelete, setSelectedReportForDelete] = useState<PlasticReport | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Active Chat Target
  const [targetConversationId, setTargetConversationId] = useState<string | null>(null);

  // Routing initial selected stops
  const [initialReportsForRoute, setInitialReportsForRoute] = useState<PlasticReport[]>([]);

  // Subscribe to all reports for cross-module matching & impact
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const list: PlasticReport[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) } as PlasticReport);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAllReports(list);
      },
      (err) => console.error('Error fetching reports snapshot:', err)
    );
    return () => unsub();
  }, []);

  // Subscribe to organization need posts for cross-module matching
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'organizationPosts'),
      (snap) => {
        const list: OrganizationNeedPost[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) } as OrganizationNeedPost);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setOrganizationPosts(list);
      },
      (err) => console.error('Error fetching organization posts snapshot:', err)
    );
    return () => unsub();
  }, []);

  // Delete Report Execution
  const handleConfirmDelete = async () => {
    if (!selectedReportForDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const result = await deleteReportPermanently(selectedReportForDelete.id);
      if (!result.success) {
        setDeleteError(result.error || 'Failed to delete report from database.');
        return;
      }
      setIsDeleteModalOpen(false);
      setSelectedReportForDelete(null);
      if (selectedReportForDetails?.id === selectedReportForDelete.id) {
        setSelectedReportForDetails(null);
      }
    } catch (err: any) {
      console.error('Error deleting report:', err);
      setDeleteError(err?.message || 'Unexpected error during report deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Status Change from Details Modal
  const handleStatusChange = async (reportId: string, newStatus: any) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      if (selectedReportForDetails && selectedReportForDetails.id === reportId) {
        setSelectedReportForDetails({
          ...selectedReportForDetails,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Start or open Chat from Report
  const handleStartChat = async (report: PlasticReport) => {
    if (!currentUser) {
      setCurrentTab('auth-login');
      return;
    }

    if (currentUser.uid === report.creatorId) {
      // Don't chat with self
      return;
    }

    try {
      // Check if conversation already exists between this user and creator for this report
      const convsRef = collection(db, 'conversations');
      const q = query(
        convsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      const snap = await getDocs(q);

      let existingConvId: string | null = null;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.reportId === report.id &&
          Array.isArray(data.participants) &&
          data.participants.includes(report.creatorId)
        ) {
          existingConvId = docSnap.id;
        }
      });

      if (existingConvId) {
        setTargetConversationId(existingConvId);
        setCurrentTab('chat');
        setSelectedReportForDetails(null);
        return;
      }

      // Create new conversation
      const nowIso = new Date().toISOString();
      const newConvRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, report.creatorId],
        participantIds: [currentUser.uid, report.creatorId],
        individualId: report.creatorId,
        orgId: currentUser.uid,
        participantDetails: {
          [currentUser.uid]: {
            name: userProfile?.name || 'User',
            role: userRole,
            photoURL: (userProfile as any)?.photoURL || (userProfile as any)?.logoURL || ''
          },
          [report.creatorId]: {
            name: report.creatorName || 'Member',
            role: 'individual',
            photoURL: ''
          }
        },
        reportId: report.id,
        reportTitle: `${report.plasticType} - ${report.quantity} ${report.unit}`,
        lastMessage: `Inquiry regarding ${report.plasticType} plastic listing`,
        lastMessageAt: nowIso,
        lastMessageTimestamp: nowIso,
        lastMessageSenderId: currentUser.uid,
        lastSenderId: currentUser.uid,
        createdAt: nowIso,
        unreadCount: {
          [report.creatorId]: 1,
          [currentUser.uid]: 0
        }
      });

      // Add initial greeting message
      await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
        conversationId: newConvRef.id,
        senderId: currentUser.uid,
        senderName: userProfile?.name || 'User',
        senderRole: userRole,
        text: `Hello! I am interested in your ${report.plasticType} plastic (${report.quantity} ${report.unit}) located in ${report.location}. Is it currently available for collection?`,
        timestamp: new Date().toISOString(),
        read: false
      });

      setTargetConversationId(newConvRef.id);
      setCurrentTab('chat');
      setSelectedReportForDetails(null);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Start or open Chat with an Organization from their Need Post
  const handleContactOrganization = async (needPost: OrganizationNeedPost) => {
    if (!currentUser) {
      setCurrentTab('auth-login');
      return;
    }

    if (currentUser.uid === needPost.organizationId) {
      return;
    }

    try {
      const convsRef = collection(db, 'conversations');
      const q = query(
        convsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      const snap = await getDocs(q);

      let existingConvId: string | null = null;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.needPostId === needPost.id &&
          Array.isArray(data.participants) &&
          data.participants.includes(needPost.organizationId)
        ) {
          existingConvId = docSnap.id;
        }
      });

      if (existingConvId) {
        setTargetConversationId(existingConvId);
        setCurrentTab('chat');
        setSelectedReportForDetails(null);
        return;
      }

      // Create new conversation regarding org need
      const nowIso = new Date().toISOString();
      const newConvRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, needPost.organizationId],
        participantIds: [currentUser.uid, needPost.organizationId],
        individualId: currentUser.uid,
        orgId: needPost.organizationId,
        participantDetails: {
          [currentUser.uid]: {
            name: userProfile?.name || 'User',
            role: userRole,
            photoURL: (userProfile as any)?.photoURL || ''
          },
          [needPost.organizationId]: {
            name: needPost.organizationName || 'Organization',
            role: 'organization',
            photoURL: needPost.organizationLogoURL || ''
          }
        },
        needPostId: needPost.id,
        reportTitle: `${needPost.organizationName}: ${needPost.plasticType} (${needPost.requiredQuantity} ${needPost.unit})`,
        lastMessage: `Inquiry about supplying ${needPost.plasticType} plastic`,
        lastMessageAt: nowIso,
        lastMessageTimestamp: nowIso,
        lastMessageSenderId: currentUser.uid,
        lastSenderId: currentUser.uid,
        createdAt: nowIso,
        unreadCount: {
          [needPost.organizationId]: 1,
          [currentUser.uid]: 0
        }
      });

      await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
        conversationId: newConvRef.id,
        senderId: currentUser.uid,
        senderName: userProfile?.name || 'User',
        senderRole: userRole,
        text: `Hello ${needPost.organizationName}! I saw your request for ${needPost.plasticType} plastic (${needPost.requiredQuantity} ${needPost.unit}) on Cycle and I would like to discuss supplying materials to your facility.`,
        timestamp: new Date().toISOString(),
        read: false
      });

      setTargetConversationId(newConvRef.id);
      setCurrentTab('chat');
      setSelectedReportForDetails(null);
    } catch (err) {
      console.error('Error starting conversation with organization:', err);
    }
  };

  const handlePlanRouteWithReports = (reports: PlasticReport[]) => {
    setInitialReportsForRoute(reports);
    setCurrentTab('smart-routes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 selection:bg-emerald-200">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        openCreateModal={() => {
          setSelectedReportForEdit(null);
          setIsReportModalOpen(true);
        }}
        openPostNeedModal={() => {
          setSelectedNeedPostForEdit(null);
          setIsPostNeedModalOpen(true);
        }}
        openQRModal={() => setIsQRModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenReportDetails={(report) => setSelectedReportForDetails(report)}
            openCreateModal={() => {
              setSelectedReportForEdit(null);
              setIsReportModalOpen(true);
            }}
            openPostNeedModal={() => {
              setSelectedNeedPostForEdit(null);
              setIsPostNeedModalOpen(true);
            }}
            openQRModal={() => setIsQRModalOpen(true)}
          />
        )}

        {currentTab === 'feed' && (
          <ReportsFeedPage
            onOpenDetails={(report) => setSelectedReportForDetails(report)}
            onStartChat={handleStartChat}
            onEditReport={(report) => {
              setSelectedReportForEdit(report);
              setIsReportModalOpen(true);
            }}
            onDeleteReport={(report) => {
              setSelectedReportForDelete(report);
              setIsDeleteModalOpen(true);
            }}
            onCreateReport={() => {
              setSelectedReportForEdit(null);
              setIsReportModalOpen(true);
            }}
          />
        )}

        {currentTab === 'org-needs' && (
          <OrganizationNeedsPage
            allReports={allReports}
            onStartChatWithReporter={handleStartChat}
            onPlanRouteWithReports={handlePlanRouteWithReports}
            onRequestAuth={() => setCurrentTab('auth-login')}
          />
        )}

        {currentTab === 'smart-routes' && (
          <CollectionRoutesPage
            allReports={allReports}
            initialSelectedReports={initialReportsForRoute}
            organizationPosts={organizationPosts}
            onClearInitialSelected={() => setInitialReportsForRoute([])}
          />
        )}

        {currentTab === 'impact' && (
          <ImpactDashboardPage
            reports={allReports}
            organizationPosts={organizationPosts}
            onNavigateToNeeds={() => setCurrentTab('org-needs')}
            onNavigateToReports={() => setCurrentTab('feed')}
          />
        )}

        {currentTab === 'earth-intelligence' && (
          <EarthIntelligencePage
            reports={allReports}
            onNavigateToReports={() => setCurrentTab('feed')}
            onNavigateToRoutes={() => setCurrentTab('smart-routes')}
          />
        )}

        {currentTab === 'my-reports' && (
          <MyReportsPage
            onOpenDetails={(report) => setSelectedReportForDetails(report)}
            onEditReport={(report) => {
              setSelectedReportForEdit(report);
              setIsReportModalOpen(true);
            }}
            onDeleteReport={(report) => {
              setSelectedReportForDelete(report);
              setIsDeleteModalOpen(true);
            }}
            onCreateReport={() => {
              setSelectedReportForEdit(null);
              setIsReportModalOpen(true);
            }}
          />
        )}

        {currentTab === 'chat' && (
          <ChatPage initialConversationId={targetConversationId} />
        )}

        {currentTab === 'profile' && <ProfilePage />}

        {currentTab === 'admin' && (
          <AdminDashboard
            onOpenReportDetails={(report) => setSelectedReportForDetails(report)}
            openQRModal={() => setIsQRModalOpen(true)}
          />
        )}

        {currentTab === 'auth-login' && (
          <AuthPage
            initialTab="login"
            onSuccess={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'auth-signup' && (
          <AuthPage
            initialTab="signup-individual"
            onSuccess={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'contact' && (
          <div className="py-8 sm:py-12">
            <ConnectWithUsSection />
          </div>
        )}
      </main>

      {/* Global Footer */}
      <Footer
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        openQRModal={() => setIsQRModalOpen(true)}
      />

      {/* Global Modals */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedReportForEdit(null);
        }}
        reportToEdit={selectedReportForEdit}
      />

      <ReportDetailModal
        report={selectedReportForDetails}
        isOpen={!!selectedReportForDetails}
        organizationPosts={organizationPosts}
        onClose={() => setSelectedReportForDetails(null)}
        onStartChat={handleStartChat}
        onContactOrganization={handleContactOrganization}
        onEdit={(report) => {
          setSelectedReportForDetails(null);
          setSelectedReportForEdit(report);
          setIsReportModalOpen(true);
        }}
        onDelete={(report) => {
          setSelectedReportForDelete(report);
          setIsDeleteModalOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title={selectedReportForDelete?.description?.slice(0, 30) || selectedReportForDelete?.plasticType || ''}
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleteLoading) {
            setIsDeleteModalOpen(false);
            setSelectedReportForDelete(null);
            setDeleteError('');
          }
        }}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      <PostNeedModal
        isOpen={isPostNeedModalOpen}
        onClose={() => {
          setIsPostNeedModalOpen(false);
          setSelectedNeedPostForEdit(null);
        }}
        postToEdit={selectedNeedPostForEdit}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
