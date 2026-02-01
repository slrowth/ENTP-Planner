
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, loginWithGoogle, logout, resetPassword } from './services/firebase';
import { analyzeBrainDump } from './services/gemini';
import { FlowItem, AIResponse, ItemStatus, ItemType, RealityCheck } from './types';
import { COLUMNS } from './constants';
import { 
  BrainCircuit, 
  Calendar, 
  CheckSquare, 
  Lightbulb, 
  Send, 
  Loader2, 
  AlertCircle,
  Zap,
  Trash2,
  Clock,
  LayoutDashboard,
  Trophy,
  Dices,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  LogIn,
  KeyRound
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<FlowItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [realityCheck, setRealityCheck] = useState<RealityCheck | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'inbox' | 'insights'>('board');
  const [showOverloadAlert, setShowOverloadAlert] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load from localStorage on mount (scoped to user)
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`entp_flow_items_${user.uid}`);
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse items", e);
        }
      } else {
        setItems([]);
      }
    }
  }, [user]);

  // Save to localStorage on change (scoped to user)
  useEffect(() => {
    if (user) {
      localStorage.setItem(`entp_flow_items_${user.uid}`, JSON.stringify(items));
    }
  }, [items, user]);

  const handleAnalyze = async () => {
    if (!inputText.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeBrainDump(inputText);
      
      const newItems: FlowItem[] = result.items.map(item => ({
        id: crypto.randomUUID(),
        type: item.type as ItemType,
        title: item.title || '무제',
        content: item.content,
        status: item.type === 'idea' ? 'someday' : (item.type === 'schedule' ? 'today' : 'inbox'),
        aiAnalysis: {
          priority: item.priority as any,
          estimatedMinutes: item.estimated_minutes,
          tags: item.tags,
          comment: item.ai_comment,
          confidence: 1
        },
        datetime: item.datetime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      setItems(prev => [...newItems, ...prev]);
      setRealityCheck(result.reality_check);
      if (result.reality_check.is_overloaded) {
        setShowOverloadAlert(true);
      }
      setInputText('');
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const moveItem = (id: string, newStatus: ItemStatus) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        status: newStatus, 
        updatedAt: new Date().toISOString(),
        completedAt: newStatus === 'done' ? new Date().toISOString() : undefined
      } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleRandomQuest = () => {
    const somedayItems = items.filter(i => i.status === 'someday');
    if (somedayItems.length === 0) {
      alert("언젠가 할 일 목록이 비어있습니다. 아이디어를 먼저 던져보세요!");
      return;
    }
    const random = somedayItems[Math.floor(Math.random() * somedayItems.length)];
    alert(`[오늘의 랜덤 퀘스트]\n"${random.title}"에 30분만 투자해보는 건 어때요?`);
    moveItem(random.id, 'today');
  };

  const totalTodayMinutes = items
    .filter(i => i.status === 'today')
    .reduce((acc, curr) => acc + (curr.aiAnalysis?.estimatedMinutes || 0), 0);

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <nav className="w-16 md:w-20 bg-[#1e293b] border-r border-slate-700/50 flex flex-col items-center py-6 gap-8">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        
        <div className="flex flex-col gap-6">
          <NavItem active={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={<LayoutDashboard />} label="보드" />
          <NavItem active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<BrainCircuit />} label="인박스" />
          <NavItem active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<Trophy />} label="인사이트" />
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 pb-4">
           <button 
             onClick={logout}
             className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-red-400 group relative"
           >
             <LogOut className="w-5 h-5" />
             <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">Logout</span>
           </button>
           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white border border-indigo-400 overflow-hidden">
             {user.photoURL ? <img src={user.photoURL} alt="User" /> : (user.email?.charAt(0).toUpperCase() || 'U')}
           </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header / Top Bar */}
        <header className="h-16 border-b border-slate-700/50 flex items-center justify-between px-6 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ENTP Flow</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold tracking-wider uppercase">Beta</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
               <Clock className="w-4 h-4 text-slate-400" />
               <span className="text-xs font-medium text-slate-300">오늘 계획: {(totalTodayMinutes / 60).toFixed(1)}시간</span>
            </div>
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <Dices className="w-5 h-5" onClick={handleRandomQuest} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-x-auto flex flex-col">
            <div className="p-6 bg-gradient-to-b from-indigo-900/10 to-transparent">
              <div className="max-w-4xl mx-auto relative">
                <div className="relative group">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="뇌를 빼고 아무렇게나 던져보세요..."
                    className="w-full h-24 md:h-32 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none text-slate-200 placeholder-slate-500 shadow-xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleAnalyze();
                      }
                    }}
                  />
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !inputText.trim()}
                    className="absolute bottom-4 right-4 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex gap-6 px-6 pb-6 overflow-hidden">
              {activeTab === 'board' && (
                <div className="flex-1 flex gap-6 overflow-x-auto min-h-0 pb-4">
                  {COLUMNS.map(col => (
                    <BoardColumn 
                      key={col.id} 
                      column={col} 
                      items={items.filter(i => i.status === col.id)} 
                      onMove={moveItem}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )}
              {activeTab === 'inbox' && (
                <div className="flex-1 max-w-4xl mx-auto flex flex-col gap-4 overflow-y-auto pr-2">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <BrainCircuit className="text-indigo-400" /> 처리 대기 중인 뇌 덤프
                  </h2>
                  {items.filter(i => i.status === 'inbox').length === 0 ? (
                    <div className="flex-col flex items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 italic text-center px-4">
                      <p>여긴 깨끗하네요. 아이디어를 마구 던져주세요!</p>
                    </div>
                  ) : (
                    items.filter(i => i.status === 'inbox').map(item => (
                      <Card key={item.id} item={item} onMove={moveItem} onDelete={deleteItem} />
                    ))
                  )}
                </div>
              )}
              {activeTab === 'insights' && (
                <div className="flex-1 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 pb-6">
                  <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-3xl h-fit">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                      <Zap className="text-amber-400" /> AI 실시간 코칭
                    </h2>
                    <div className="space-y-4">
                      <p className="text-slate-400 text-sm leading-relaxed italic">
                        "{items.filter(i => i.status === 'today').length > 5 ? "할 일이 너무 많아요. ENTP는 압박감을 즐긴다지만 이건 좀..." : "오늘 아주 기운찬데요? 랜덤 퀘스트 하나 가시죠!"}"
                      </p>
                      <button onClick={handleRandomQuest} className="w-full py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 transition-all font-bold">
                        오늘의 랜덤 퀘스트 돌리기
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-3xl h-fit">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                      <Trophy className="text-indigo-400" /> 성취 뱃지
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <Badge name="시작의 제왕" unlocked={items.length > 5} description="아이디어를 5개 이상 투척함" />
                      <Badge name="마감의 신" unlocked={items.filter(i => i.status === 'done').length > 1} description="실제로 뭔가를 끝내봄" />
                      <Badge name="아이디어 뱅크" unlocked={items.filter(i => i.type === 'idea').length > 10} description="세상을 바꿀 뻔한 생각 10회" />
                      <Badge name="현실 자각" unlocked={showOverloadAlert} description="무모한 계획으로 경고를 받음" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showOverloadAlert && realityCheck && (
          <div className="fixed bottom-6 right-6 max-w-sm bg-slate-900 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 rounded-2xl p-4 z-50 animate-bounce-in">
             <div className="flex items-start gap-3">
               <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
               <div className="flex-1">
                 <h4 className="text-sm font-bold text-amber-500 mb-1">⚠️ 현실 체크 타임!</h4>
                 <p className="text-xs text-slate-300 leading-relaxed mb-3">{realityCheck.suggestion}</p>
                 <button 
                  onClick={() => setShowOverloadAlert(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-400 border border-slate-700"
                 >
                   알았어... (반성 중)
                 </button>
               </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Auth Component ---

const LoginView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('비밀번호를 재설정하려면 먼저 이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await resetPassword(email);
      setSuccessMsg('비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해주세요!');
    } catch (err: any) {
      setError('비밀번호 재설정 메일 발송에 실패했습니다: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e293b] rounded-[2rem] p-8 shadow-2xl border border-slate-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ENTP Flow</h1>
          <p className="text-slate-400 text-sm mt-1">아이디어는 번개처럼, 정리는 빛처럼</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="entp@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              {isLogin && (
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>}
          
          {successMsg && <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
            <KeyRound className="w-4 h-4 shrink-0" />
            <p>{successMsg}</p>
          </div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">OR</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        <button 
          onClick={loginWithGoogle}
          className="w-full mt-6 bg-white hover:bg-slate-100 py-3 rounded-xl font-bold text-slate-900 transition-all flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Google로 계속하기
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? '처음이신가요?' : '이미 계정이 있으신가요?'}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccessMsg('');
            }}
            className="ml-2 text-indigo-400 font-bold hover:underline"
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Subcomponents ---

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-all group ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <div className={`p-2.5 rounded-xl transition-all ${active ? 'bg-indigo-500/10 shadow-inner' : 'group-hover:bg-slate-800'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

const BoardColumn: React.FC<{ column: any; items: FlowItem[]; onMove: (id: string, s: ItemStatus) => void; onDelete: (id: string) => void }> = ({ column, items, onMove, onDelete }) => (
  <div className="flex-shrink-0 w-80 flex flex-col gap-4">
    <div className={`flex items-center justify-between px-2 pb-1 border-b ${column.color}`}>
      <h3 className="text-sm font-bold">{column.title}</h3>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
        {items.length}
      </span>
    </div>
    <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-2">
      {items.map(item => (
        <Card key={item.id} item={item} onMove={onMove} onDelete={onDelete} compact />
      ))}
      {items.length === 0 && (
        <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 italic text-xs">
          비어 있음
        </div>
      )}
    </div>
  </div>
);

const Card: React.FC<{ item: FlowItem; onMove: (id: string, s: ItemStatus) => void; onDelete: (id: string) => void; compact?: boolean }> = ({ item, onMove, onDelete, compact }) => {
  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'schedule': return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'task': return <CheckSquare className="w-4 h-4 text-green-400" />;
      case 'idea': return <Lightbulb className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="group relative bg-[#1e293b]/60 border border-slate-700/50 hover:border-indigo-500/40 p-4 rounded-2xl shadow-sm transition-all hover:shadow-xl hover:-translate-y-0.5">
      <div className="flex gap-3">
        <div className="mt-0.5 flex-shrink-0">{getTypeIcon(item.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{item.title}</h4>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          {item.content && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{item.content}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {item.aiAnalysis?.estimatedMinutes && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 font-medium"><Clock className="w-3 h-3" /> {item.aiAnalysis.estimatedMinutes}m</span>}
            {item.aiAnalysis?.priority && <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-tight ${item.aiAnalysis.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : item.aiAnalysis.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{item.aiAnalysis.priority}</span>}
            {item.aiAnalysis?.tags?.slice(0, 2).map(tag => <span key={tag} className="text-[10px] text-slate-500 font-mono">#{tag}</span>)}
          </div>
          {item.aiAnalysis?.comment && <div className="mt-3 p-2 bg-slate-900/50 rounded-lg border-l-2 border-indigo-500/50 italic text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">"{item.aiAnalysis.comment}"</div>}
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {item.status !== 'today' && <ActionButton onClick={() => onMove(item.id, 'today')} label="오늘" />}
        {item.status !== 'this_week' && <ActionButton onClick={() => onMove(item.id, 'this_week')} label="이번 주" />}
        {item.status !== 'someday' && <ActionButton onClick={() => onMove(item.id, 'someday')} label="언젠가" />}
        {item.status !== 'done' ? (
          <button onClick={() => onMove(item.id, 'done')} className="ml-auto px-3 py-1 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase transition-all">완료</button>
        ) : <span className="ml-auto text-[10px] text-green-500/50 italic font-medium">Completed ✨</span>}
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick} className="whitespace-nowrap px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-[10px] font-bold transition-colors">{label}</button>
);

const Badge: React.FC<{ name: string; unlocked: boolean; description: string }> = ({ name, unlocked, description }) => (
  <div className={`p-4 rounded-2xl border text-center transition-all ${unlocked ? 'bg-indigo-500/10 border-indigo-500/30 text-slate-200 shadow-lg shadow-indigo-500/5' : 'bg-slate-900 border-slate-800 text-slate-600 opacity-60 grayscale'}`}>
    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${unlocked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-700'}`}><Trophy className="w-5 h-5" /></div>
    <h5 className="text-[11px] font-bold mb-1">{name}</h5>
    <p className="text-[9px] leading-tight">{description}</p>
  </div>
);

export default App;
