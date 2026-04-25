import { useState, useEffect, useRef } from 'react'
import { Bell, Clock, Plus, Check, Calendar, Moon, Sun, X, AlertCircle, LogIn, LogOut, User, AlignLeft, Trash2, Mic, MicOff, Play, Pause, Volume2, Shield, Link2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { notificationScheduler } from './services/notificationScheduler'
import { auth, googleProvider, signInWithPopup, signOut } from './lib/firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from './lib/firebase'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

function App() {
  const [tasks, setTasks] = useState<Array<{
    id: string
    title: string
    description?: string
    dueDate: Date
    completed: boolean
    reminders: number[]
    priority: 'low' | 'medium' | 'high'
  }>>([])

  const [newTask, setNewTask] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reminders, setReminders] = useState<number[]>([300]) // Default to 5 hours (300 mins)
  const [darkMode, setDarkMode] = useState(true)
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''})
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [linkedUsers, setLinkedUsers] = useState<any[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [isPoll, setIsPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  useEffect(() => {
    notificationScheduler.init()
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsAdmin(user?.email?.includes('admin') || false)
      setLoading(false)
    })
    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!user) {
      setTasks([])
      return
    }

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid))
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate)
        }
      }) as any[]
      setTasks(taskList)
    })

    return () => unsubscribeTasks()
  }, [user])

  useEffect(() => {
    if (!user || !isAdmin) {
      setLinkedUsers([])
      return
    }
    const q = query(collection(db, 'users'), where('linkedAdminId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLinkedUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsubscribe()
  }, [user, isAdmin])

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      showToast('Signed in successfully!')
    } catch (error) {
      showToast('Error signing in. Please try again.')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      showToast('Signed out successfully!')
    } catch (error) {
      showToast('Error signing out.')
    }
  }

  const showToast = (message: string) => {
    setToast({show: true, message})
    setTimeout(() => setToast({show: false, message: ''}), 3000)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      showToast('Recording started...')
    } catch (error) {
      showToast('Error accessing microphone.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    showToast('Recording stopped. Voice note attached.')
  }

  const generateInviteLink = async () => {
    if (!user) return
    const token = Math.random().toString(36).substring(2, 15)
    const link = `${window.location.origin}/invite/${token}`
    setInviteLink(link)
    await addDoc(collection(db, 'invites'), {
      adminId: user.uid,
      token,
      createdAt: Timestamp.now(),
      used: false
    })
    showToast('Invite link generated!')
  }

  const addTask = async () => {
    if (!newTask || !dueDate || !user) {
      showToast('Please enter task title and due date')
      return
    }

    const dueDateTime = new Date(dueDate)
    const taskData = {
      userId: user.uid,
      title: newTask,
      description,
      dueDate: Timestamp.fromDate(dueDateTime),
      completed: false,
      reminders: [...reminders],
      priority: 'medium',
      createdAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(db, 'tasks'), taskData)
      const taskId = docRef.id

      // Schedule all custom reminders
      for (const offset of reminders) {
        await notificationScheduler.scheduleReminder(
          taskId,
          newTask,
          dueDateTime,
          offset
        )
      }

      setNewTask('')
      setDescription('')
      setDueDate('')
      setReminders([300]) // Reset to default 5 hours
      showToast('Task scheduled and synced successfully!')
    } catch (error) {
      showToast('Error adding task to cloud.')
    }
  }

  const toggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && user) {
      try {
        const newCompleted = !task.completed
        await updateDoc(doc(db, 'tasks', taskId), {
          completed: newCompleted
        })

        if (newCompleted) {
          task.reminders.forEach(offset => {
            notificationScheduler.cancelReminder(`${taskId}-${offset}`)
          })
        }
        
        showToast(newCompleted ? 'Task completed! Reminders cancelled.' : 'Task marked as pending')
      } catch (error) {
        showToast('Error updating task status.')
      }
    }
  }

  const deleteTask = async (taskId: string) => {
    if (user && window.confirm('Are you sure you want to delete this task?')) {
      try {
        const task = tasks.find(t => t.id === taskId)
        if (task) {
          task.reminders.forEach(offset => {
            notificationScheduler.cancelReminder(`${taskId}-${offset}`)
          })
        }
        await deleteDoc(doc(db, 'tasks', taskId))
        showToast('Task deleted successfully.')
      } catch (error) {
        showToast('Error deleting task.')
      }
    }
  }

  const priorityColors = {
    low: 'bg-green-500/10 text-green-400 border-green-500/30',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-slate-900'}`}>
      
      {/* Toast Notification */}
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className={`${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-xl rounded-xl px-5 py-3 shadow-2xl backdrop-blur-sm flex items-center gap-3`}>
          <AlertCircle className="w-5 h-5 text-blue-400" />
          <span className="font-medium">{toast.message}</span>
        </div>
      </div>

      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white/80 border-gray-200/50'} backdrop-blur-xl border-b sticky top-0 z-40 px-4 py-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Bell className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">RelaySignal</h1>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reliable Offline Notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Active</span>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2.5 rounded-xl transition-all ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <div className={`hidden md:block text-right`}>
                  <p className="text-xs font-medium">{user.displayName}</p>
                  <button onClick={handleSignOut} className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-bold">Sign Out</button>
                </div>
                <img src={user.photoURL || ''} className="w-9 h-9 rounded-xl border-2 border-blue-500/30" alt={user.displayName || ''} />
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/25 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 pt-8">
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${darkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100'}`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">Admin Panel</span>
              </div>
              {showAdminPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showAdminPanel && (
              <div className={`mt-4 grid gap-4 p-6 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-blue-400" />
                      <h3 className="font-semibold text-sm">Linked Users ({linkedUsers.length})</h3>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {linkedUsers.map(u => (
                        <div key={u.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700/50' : 'bg-white'}`}>
                          <img src={u.photoURL || ''} className="w-6 h-6 rounded-full" alt="" />
                          <span className="flex-1 truncate">{u.displayName || u.email}</span>
                        </div>
                      ))}
                      {linkedUsers.length === 0 && (
                        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'} italic`}>No users linked yet.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-5 h-5 text-green-400" />
                      <h3 className="font-semibold text-sm">Invite Link</h3>
                    </div>
                    <button
                      onClick={generateInviteLink}
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Generate Invite Link
                    </button>
                    {inviteLink && (
                      <div className={`mt-3 p-3 rounded-lg text-xs break-all ${darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-white text-gray-600'}`}>
                        {inviteLink}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className={`${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border rounded-2xl p-8 mb-8 text-center backdrop-blur-sm`}>
            <User className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign in to get started</h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Connect your account to sync tasks across devices and unlock all features.</p>
            <button 
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        )}

        {/* Create Task Card */}
        <div className={`${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/80 border-gray-200/50'} backdrop-blur-sm border rounded-2xl p-6 mb-8 shadow-xl shadow-black/5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${!user ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Plus className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Schedule New Task</h2>
          </div>
          
          <div className="grid gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="What do you need to remember?"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className={`w-full px-4 py-4 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none ${darkMode ? 'bg-slate-700/50 border-slate-600/50 placeholder:text-slate-500 font-semibold text-lg' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400 font-semibold text-lg'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'} flex items-center gap-2 ml-1`}>
                <AlignLeft className="w-3 h-3" /> Description (Optional)
              </label>
              <div className={`rounded-xl overflow-hidden border ${darkMode ? 'border-slate-700 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}`}>
                <ReactQuill 
                  theme="snow" 
                  value={description} 
                  onChange={setDescription}
                  placeholder="Add more details about this task..."
                  className={darkMode ? 'quill-dark' : ''}
                />
              </div>
            </div>

            {/* Poll Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPoll(!isPoll)}
                className={`px-4 py-2 rounded-xl border transition-all text-sm font-medium ${isPoll ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : darkMode ? 'bg-slate-700/50 border-slate-600/50 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                {isPoll ? 'Poll Task' : 'Standard Task'}
              </button>
            </div>

            {isPoll && (
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'} ml-1`}>Poll Options</label>
                <div className="space-y-2">
                  {pollOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions]
                          newOptions[idx] = e.target.value
                          setPollOptions(newOptions)
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl border transition-all outline-none ${darkMode ? 'bg-slate-700/50 border-slate-600/50 placeholder:text-slate-500' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'}`}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className={`px-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-700/50 border-slate-600/50 hover:bg-red-500/20 hover:text-red-400' : 'bg-gray-50 border-gray-200 hover:bg-red-50 hover:text-red-500'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className={`w-full py-2 rounded-xl border border-dashed text-sm font-medium transition-all ${darkMode ? 'border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50' : 'border-gray-300 text-gray-500 hover:text-blue-500 hover:border-blue-400'}`}
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> Add Option
                  </button>
                </div>
              </div>
            )}

            {/* Voice Note */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-400'} flex items-center gap-2 ml-1`}>
                <Volume2 className="w-3 h-3" /> Voice Note (Optional)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 font-medium ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : darkMode ? 'bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {isRecording ? 'Stop Recording' : 'Record Voice Note'}
                </button>
                {audioUrl && (
                  <audio controls src={audioUrl} className="flex-1 max-w-[300px] h-10" />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 ${darkMode ? 'bg-slate-700/50 border-slate-600/50' : 'bg-gray-50 border-gray-200'}`}>
                <Calendar className={`w-4 h-4 shrink-0 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`flex-1 bg-transparent outline-none w-full ${darkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-gray-400'}`}
                />
              </div>
              
              <div className="space-y-3">
                {reminders.map((reminder, index) => (
                  <div key={index} className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <Clock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                      <select
                        value={reminder}
                        onChange={(e) => {
                          const newReminders = [...reminders];
                          newReminders[index] = Number(e.target.value);
                          setReminders(newReminders);
                        }}
                        className={`w-full pl-11 pr-4 py-4 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none appearance-none ${darkMode ? 'bg-slate-700/50 border-slate-600/50' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <option value={5}>5 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                        <option value={180}>3 hours before</option>
                        <option value={300}>5 hours before</option>
                        <option value={1440}>24 hours before</option>
                      </select>
                    </div>
                    {reminders.length > 1 && (
                      <button
                        onClick={() => setReminders(reminders.filter((_, i) => i !== index))}
                        className={`px-4 rounded-xl border transition-all flex items-center justify-center ${darkMode ? 'bg-slate-700/50 border-slate-600/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50' : 'bg-gray-50 border-gray-200 hover:bg-red-50 hover:text-red-500'}`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={() => setReminders([...reminders, 60])}
                  className={`w-full py-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 text-sm font-medium ${darkMode ? 'border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50' : 'border-gray-300 text-gray-500 hover:text-blue-500 hover:border-blue-400'}`}
                >
                  <Plus className="w-4 h-4" /> Add Another Reminder
                </button>
              </div>
            </div>

            <button
              onClick={addTask}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> 
              Schedule with Offline Reminder
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/80 border-gray-200/50'} backdrop-blur-sm border rounded-2xl p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-px ${task.completed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      className={`font-semibold text-base cursor-pointer hover:text-blue-400 transition-colors ${task.completed ? 'line-through' : ''}`}
                    >
                      {task.title}
                    </h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && task.description !== '<p><br></p>' && (
                    <div 
                      className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'} ${expandedTaskId === task.id ? '' : 'line-clamp-2'} prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}
                      dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                  )}
                  <div className={`flex flex-wrap items-center gap-4 mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.dueDate).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-4 h-4" />
                      {task.reminders.map((offset, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded-md text-xs border ${darkMode ? 'bg-slate-700/50 border-slate-600/50' : 'bg-gray-100 border-gray-200'}`}>
                          {offset < 60 ? `${offset}m` : `${offset / 60}h`}
                        </span>
                      ))}
                    </div>
                    {task.completed && (
                      <span className="text-green-500 font-medium text-xs bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                        Completed
                      </span>
                    )}
                  </div>
                  {expandedTaskId === task.id && (
                    <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>All Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Created</span>
                          <p>{new Date(task.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Reminders</span>
                          <p>{task.reminders.length} set</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className={`p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${task.completed ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20' : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className={`p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${darkMode ? 'hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${darkMode ? 'border-slate-700/50 text-slate-400' : 'border-gray-200 text-gray-500'}`}>
              <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 mb-4">
                <Bell className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-lg font-medium mb-2">No tasks scheduled yet</p>
              <p className="text-sm opacity-70">Create a task above to test reliable offline notifications</p>
            </div>
          )}
        </div>
      </main>

      <footer className={`mt-16 py-6 border-t ${darkMode ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-500'} text-center text-sm`}>
        Made By: Ahmed Emad
      </footer>
    </div>
  )
}

export default App
