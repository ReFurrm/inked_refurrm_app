import { useState } from 'react'
import { 
  Ghost, 
  Pen, 
  Sparkles, 
  History, 
  FileText, 
  Settings,
  ChevronRight,
  Send,
  Wand2,
  RotateCcw,
  Copy,
  Download,
  Menu,
  X,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

// Mock AI functions (stubs as mentioned in README)
const callManuscriptAPI = async (prompt) => {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return `Here is a continuation based on your prompt...\n\nThe ink dried on the page, but the words still seemed to shimmer with possibility. Each sentence carried the weight of unspoken intention, waiting for the reader to breathe life into its contours.`
}

const callClarityAPI = async (question) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `Consider the timeline implications:\n- Check if the dates align with your narrative arc\n- Verify character ages at key plot points\n- Ensure historical accuracy for any real-world references`
}

function App() {
  const [activeMode, setActiveMode] = useState('draft') // draft, edit, admin, library
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('style') // style, plot, clarity
  const [styleAnchor, setStyleAnchor] = useState('')
  const [plotPrompt, setPlotPrompt] = useState('')
  const [clarityQuestion, setClarityQuestion] = useState('')
  const [clarityResponse, setClarityResponse] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState([])
  const [linkedFile, setLinkedFile] = useState(null)
  const [syncStatus, setSyncStatus] = useState('linked') // linked, unsynced, synced

  // Demo content
  const demoChapters = [
    { id: 1, title: 'Chapter 1: The Beginning', lastEdited: '2 hours ago' },
    { id: 2, title: 'Chapter 2: The Journey', lastEdited: '1 day ago' },
    { id: 3, title: 'Chapter 3: The Confrontation', lastEdited: '3 days ago' }
  ]

  const handleGenerate = async () => {
    if (!inputText.trim()) return
    
    setIsGenerating(true)
    try {
      const result = await callManuscriptAPI({
        style: styleAnchor,
        context: inputText,
        plotDirection: plotPrompt
      })
      setOutputText(result)
      setHistory(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        preview: result.substring(0, 50) + '...',
        type: 'generation'
      }, ...prev])
    } catch (error) {
      console.error('Generation failed:', error)
    }
    setIsGenerating(false)
  }

  const handleClarityCheck = async () => {
    if (!clarityQuestion.trim()) return
    
    setIsGenerating(true)
    try {
      const response = await callClarityAPI(clarityQuestion)
      setClarityResponse(response)
    } catch (error) {
      console.error('Clarity check failed:', error)
    }
    setIsGenerating(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText)
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-gray-100 overflow-hidden">
      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#0d1117] border-r border-[#1e293b] transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Ghost className="w-8 h-8 text-[#00F0FF]" />
              <span className="font-bold text-xl">Inked</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <nav className="p-4 space-y-2">
              <button 
                onClick={() => setActiveMode('draft')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'draft' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <Pen size={18} />
                <span>Draft</span>
              </button>
              <button 
                onClick={() => setActiveMode('edit')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'edit' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <Wand2 size={18} />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => setActiveMode('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'admin' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <FileText size={18} />
                <span>Admin Desk</span>
              </button>
              <button 
                onClick={() => setActiveMode('library')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeMode === 'library' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30' : 'hover:bg-[#1e293b]'
                }`}
              >
                <BookOpen size={18} />
                <span>Library</span>
              </button>
            </nav>

            <div className="p-4 border-t border-[#1e293b]">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Chapters</h3>
              <div className="space-y-2">
                {demoChapters.map(chapter => (
                  <button key={chapter.id} className="w-full text-left px-3 py-2 rounded hover:bg-[#1e293b] text-sm text-gray-400 hover:text-white transition-colors">
                    {chapter.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-[#1e293b]">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1e293b] transition-colors text-gray-400">
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#0d1117] border-b border-[#1e293b] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium">Inked Ghost-Writer</h1>
            <span className="px-2 py-1 bg-[#008080]/20 text-[#00F0FF] text-xs rounded border border-[#008080]/30">
              AI Co-Author
            </span>
          </div>
          <div className="flex items-center gap-4">
            {linkedFile && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
                syncStatus === 'synced' ? 'bg-green-500/20 text-green-400' :
                syncStatus === 'unsynced' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-green-400' :
                  syncStatus === 'unsynced' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`}></span>
                <span className="capitalize">{syncStatus}</span>
                <span className="text-gray-400">| {linkedFile}</span>
              </div>
            )}
            <button className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors">
              <History size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[#1e293b] rounded-lg text-sm hover:bg-[#2d3748] transition-colors">
                  Notebook Width
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Last autosave: 2 min ago</span>
              </div>
            </div>

            <div className="flex-1 bg-[#0d1117] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
                <span className="text-sm text-gray-400">Chapter Draft</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-[#1e293b] rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                  <button className="p-2 hover:bg-[#1e293b] rounded transition-colors">
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-auto">
                {outputText ? (
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{outputText}</p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Start writing or use AI to generate content...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-4 bg-[#0d1117] rounded-xl border border-[#1e293b] p-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Continue your story or describe what you want to generate..."
                className="w-full bg-transparent resize-none focus:outline-none text-gray-300 placeholder-gray-500"
                rows={3}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setLinkedFile(linkedFile ? null : 'document.md')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      linkedFile ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-[#1e293b] hover:bg-[#2d3748]'
                    }`}
                  >
                    {linkedFile ? '📎 Linked' : '📎 Link File'}
                  </button>
                </div>
                <button
