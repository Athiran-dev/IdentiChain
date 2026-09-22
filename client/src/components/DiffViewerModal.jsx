import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText } from 'lucide-react';

/**
 * Diff viewer modal for change request review.
 * Uses Monaco DiffEditor for text/code files.
 * Falls back to a message for PDF/image (not implemented in v1 — see plan Q2).
 *
 * Props:
 *   currentContent   — base64-encoded current version content
 *   proposedContent  — base64-encoded proposed version content
 *   fileType         — MIME type
 *   fileName         — document name (for language detection)
 *   versionWarning   — optional warning string (base version mismatch)
 *   changeRequest    — { submittedBy, baseVersion, name, createdAt }
 *   onClose          — callback
 */
export default function DiffViewerModal({
  currentContent,
  proposedContent,
  fileType,
  fileName,
  versionWarning,
  changeRequest,
  onClose,
}) {
  const [DiffEditorComponent, setDiffEditorComponent] = useState(null);

  // Lazy-load Monaco DiffEditor
  useEffect(() => {
    import('@monaco-editor/react').then((mod) => {
      setDiffEditorComponent(() => mod.DiffEditor);
    });
  }, []);

  // Block keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const isTextFile = useMemo(() => {
    if (fileType?.startsWith('text/')) return true;
    if (fileType?.includes('json') || fileType?.includes('xml') || fileType?.includes('javascript')) return true;
    // Check extension
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const codeExts = new Set([
        'c', 'cpp', 'h', 'hpp', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs',
        'json', 'xml', 'yaml', 'yml', 'html', 'css', 'md', 'txt', 'sh', 'sql', 'rb', 'php',
      ]);
      if (ext && codeExts.has(ext)) return true;
    }
    return false;
  }, [fileType, fileName]);

  // Decode base64 to string for text files
  const currentText = useMemo(() => {
    if (!isTextFile || !currentContent) return '';
    try {
      return atob(currentContent);
    } catch {
      return '// Failed to decode current content';
    }
  }, [currentContent, isTextFile]);

  const proposedText = useMemo(() => {
    if (!isTextFile || !proposedContent) return '';
    try {
      return atob(proposedContent);
    } catch {
      return '// Failed to decode proposed content';
    }
  }, [proposedContent, isTextFile]);

  // Detect language for Monaco
  const language = useMemo(() => {
    if (!fileName) return 'plaintext';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'c': 'c', 'cpp': 'cpp', 'h': 'c', 'hpp': 'cpp',
      'java': 'java', 'json': 'json', 'html': 'html', 'css': 'css',
      'md': 'markdown', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
      'sh': 'shell', 'sql': 'sql', 'go': 'go', 'rs': 'rust', 'txt': 'plaintext',
    };
    return map[ext] || 'plaintext';
  }, [fileName]);

  return (
    <div style={overlayStyle} onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <FileText size={20} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Change Request Diff
            </span>
            {changeRequest && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                by {changeRequest.submittedBy?.slice(0, 8)}… · base v{changeRequest.baseVersion}
              </span>
            )}
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Version warning */}
        {versionWarning && (
          <div style={{
            padding: '0.6rem 1.5rem',
            background: '#fff3cd',
            color: '#856404',
            fontSize: '0.85rem',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            ⚠️ {versionWarning}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {isTextFile ? (
            DiffEditorComponent ? (
              <DiffEditorComponent
                height="100%"
                language={language}
                original={currentText}
                modified={proposedText}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  contextmenu: false,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Loading diff editor…
              </div>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
              <FileText size={48} strokeWidth={1.2} />
              <p style={{ fontSize: '1rem' }}>
                Visual diff is available for text/code files only.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                For PDF/image files, use the "View" button to inspect the proposed version directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
};

const modalStyle = {
  width: '95vw',
  height: '90vh',
  maxWidth: '1400px',
  background: 'var(--neo-bg, #e8edf2)',
  borderRadius: '16px',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.5)',
  flexShrink: 0,
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.35rem',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'inherit',
};
