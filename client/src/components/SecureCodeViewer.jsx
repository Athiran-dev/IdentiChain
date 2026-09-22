import React, { useMemo, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Save, Send } from 'lucide-react';

/**
 * Map file extensions to Monaco language identifiers.
 */
const EXTENSION_LANGUAGE_MAP = {
  '.js': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cxx': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
  '.java': 'java',
  '.json': 'json',
  '.html': 'html', '.htm': 'html',
  '.css': 'css',
  '.md': 'markdown',
  '.xml': 'xml',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.sh': 'shell', '.bash': 'shell',
  '.sql': 'sql',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.txt': 'plaintext',
};

/**
 * Detect Monaco language from a filename or MIME type.
 */
function detectLanguage(fileName, contentType) {
  if (fileName) {
    const ext = '.' + fileName.split('.').pop().toLowerCase();
    if (EXTENSION_LANGUAGE_MAP[ext]) return EXTENSION_LANGUAGE_MAP[ext];
  }
  // Fallback from content type
  if (contentType?.includes('javascript')) return 'javascript';
  if (contentType?.includes('json')) return 'json';
  if (contentType?.includes('html')) return 'html';
  if (contentType?.includes('css')) return 'css';
  if (contentType?.includes('xml')) return 'xml';
  return 'plaintext';
}

/**
 * Secure code viewer/editor using Monaco Editor.
 *
 * Props:
 *   content        — file content as a string
 *   fileName       — original file name (for language detection)
 *   contentType    — MIME type fallback for language detection
 *   accessLevel    — 'VIEW' or 'EDIT'
 *   onDirectEdit   — callback(modifiedContent) for Manager/Admin to bypass CR and update directly
 */
export default function SecureCodeViewer({ content, fileName, contentType, accessLevel, onSubmitForReview, onDirectEdit }) {
  const editorRef = useRef(null);
  const [modified, setModified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const language = useMemo(() => detectLanguage(fileName, contentType), [fileName, contentType]);
  const isEditable = accessLevel === 'EDIT' && (!!onSubmitForReview || !!onDirectEdit);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback((value) => {
    if (value !== content) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [content]);

  const handleSubmitForReview = useCallback(async () => {
    if (!editorRef.current || !onSubmitForReview) return;
    const currentContent = editorRef.current.getValue();
    setSubmitting(true);
    try {
      await onSubmitForReview(currentContent);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmitForReview]);

  const handleDirectEdit = useCallback(async () => {
    if (!editorRef.current || !onDirectEdit) return;
    const currentContent = editorRef.current.getValue();
    setSubmitting(true);
    try {
      await onDirectEdit(currentContent);
    } finally {
      setSubmitting(false);
    }
  }, [onDirectEdit]);

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      {/* Editor toolbar */}
      {isEditable && (
        <div style={toolbarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
              {modified ? '● Modified' : 'No changes'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #999)', fontStyle: 'italic' }}>
              — Changes will be submitted for manager review
            </span>
          </div>
          {onDirectEdit ? (
            <button 
              onClick={handleDirectEdit}
              disabled={!modified || submitting}
              style={{
                ...submitBtnStyle,
                background: modified ? 'var(--primary-blue, #4f46e5)' : '#cbd5e1',
                color: modified ? '#fff' : '#64748b',
                cursor: modified && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button 
              onClick={handleSubmitForReview}
              disabled={!modified || submitting}
              style={{
                ...submitBtnStyle,
                background: modified ? 'var(--primary-blue, #4f46e5)' : '#cbd5e1',
                color: modified ? '#fff' : '#64748b',
                cursor: modified && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              <Send size={16} />
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !isEditable,
            contextmenu: false,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            domReadOnly: !isEditable,
            renderWhitespace: 'selection',
            padding: { top: 8 },
          }}
        />
      </div>

      {/* Security notice */}
      <div style={noticeStyle}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)' }}>
          🔒 In-platform viewing — browser save/print shortcuts are intercepted. This reduces casual leakage but is not a cryptographic DRM guarantee.
        </span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const wrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const toolbarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 1rem',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.4)',
  flexShrink: 0,
};

const submitBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};

const noticeStyle = {
  padding: '0.35rem 1rem',
  borderTop: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(0,0,0,0.02)',
  flexShrink: 0,
};
