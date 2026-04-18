import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Link as LinkIcon, Code, Play, Zap, GitBranch, Layers } from 'lucide-react'

function HomePage() {
  console.log("DEBUG: HomePage MOUNTED");
  const [repoUrl, setRepoUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleAnalyze = () => {
    if (!repoUrl || isLoading) return
    setIsLoading(true)

    const parts = repoUrl.split('/')
    let repoName = parts[parts.length - 1] || parts[parts.length - 2]
    if (repoName?.endsWith('.git')) repoName = repoName.slice(0, -4)
    if (!repoName) repoName = 'unknown-repo'

    setPreview({
      name: repoName,
      stars: Math.floor(Math.random() * 10000) + 100,
      language: 'JavaScript'
    })

    setTimeout(() => {
      navigate('/analysis', { state: { repoUrl } })
      setIsLoading(false)
    }, 1200)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#060612', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Background Gradient Orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '600px',
          background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.18) 0%, rgba(139, 92, 246, 0.1) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '5%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '5%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '28px 48px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 900 }}>G</span>
          </div>
          Codebase <span style={{ color: '#60a5fa' }}>GPS</span>
        </div>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <button style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Documentation
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <Code style={{ width: '14px', height: '14px' }} /> GitHub
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 24px 80px' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', border: '1px solid rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.08)', color: '#93c5fd', marginBottom: '32px' }}>
          <Zap style={{ width: '12px', height: '12px' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>AI-Powered Codebase Intelligence</span>
        </div>

        {/* Headlines */}
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'white', maxWidth: '900px' }}>
          Understand Any Codebase
        </h1>
        <h2 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 28px', background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', maxWidth: '900px' }}>
          Instantly.
        </h2>
        <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', maxWidth: '480px', marginBottom: '48px' }}>
          Paste any GitHub URL. Watch your architecture become a living, interactive map — in seconds.
        </p>

        {/* Input Box */}
        <div style={{ width: '100%', maxWidth: '640px' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <LinkIcon style={{ width: '16px', height: '16px', marginRight: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '14px', padding: '12px 0' }}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !repoUrl}
              style={{
                padding: '12px 28px',
                background: isLoading || !repoUrl ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading || !repoUrl ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '150px',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}>
              {isLoading ? (
                <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>Analyzing...</span></>
              ) : (
                <><Play style={{ width: '14px', height: '14px' }} /><span>Analyze Repo</span></>
              )}
            </button>
          </div>
          <p style={{ fontSize: '11px', marginTop: '10px', color: 'rgba(255,255,255,0.18)' }}>
            Works with any public GitHub repository
          </p>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '44px' }}>
          {[
            { icon: <GitBranch style={{ width: '13px', height: '13px' }} />, text: 'Dependency Graph' },
            { icon: <Layers style={{ width: '13px', height: '13px' }} />, text: 'Layer Detection' },
            { icon: <Zap style={{ width: '13px', height: '13px' }} />, text: 'Impact Analysis' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 500 }}>
              {icon} {text}
            </div>
          ))}
        </div>

        {/* Preview Card */}
        {preview && (
          <div style={{ marginTop: '48px', width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '32px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '5px', height: '100%', background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '0 0 8px' }}>{preview.name}</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#facc15' }} /> {preview.language}
                    </span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>⭐ {preview.stars.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ padding: '4px 12px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>PUBLIC</div>
              </div>
              <div style={{ height: '8px', width: '100%', borderRadius: '999px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', width: '85%', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>
                <span>Architecture Scanned</span>
                <span style={{ color: '#60a5fa' }}>85%</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, paddingBottom: '28px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.12)' }}>
          Codebase Intelligence Layer 1.0
        </p>
      </footer>
    </div>
  )
}

export default HomePage
