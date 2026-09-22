import React, { useEffect, useMemo } from 'react';
import { X, FileText, Shield } from 'lucide-react';
import { VerificationBadge } from './DashboardComponents';
import SecurePDFViewer from './SecurePDFViewer';
import SecureCodeViewer from './SecureCodeViewer';
import SecureImageViewer from './SecureImageViewer';

/**
 * Known code/text file extensions (used for routing to Monaco).
 */
const CODE_EXTENSIONS = new Set([
  'c', 'cpp', 'cxx', 'cc', 'h', 'hpp',
  'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'go', 'rs', 'rb', 'php',
  'json', 'xml', 'yaml', 'yml',
  'html', 'htm', 'css', 'scss', 'less',
  'sh', 'bash', 'sql',
  'md', 'txt', 'log', 'csv', 'ini', 'cfg', 'conf', 'env',
]);

/**
 * Determine which renderer to use based on contentType and fileName.
 * Returns: 'pdf' | 'image' | 'code' | 'unsupported'
 */
function detectRenderer(contentType, fileName) {
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType?.startsWith('image/')) return 'image';

  // Check file extension for code/text files
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && CODE_EXTENSIONS.has(ext)) return 'code';
  }

  // Text MIME fallback
  if (contentType?.startsWith('text/')) return 'code';
  if (contentType?.includes('json') || contentType?.includes('xml') || contentType?.includes('javascript')) return 'code';
  if (contentType === 'application/octet-stream') return 'code'; // Fallback for code files without proper MIME type

  return 'unsupported';
}

/**
 * In-app secure document viewer modal.
 * Routes to format-specific renderers that avoid browser-native download/print/save.
 * Intercepts Ctrl+S, Ctrl+P, Ctrl+Shift+S while open.
 *
 * IMPORTANT: This viewer reduces casual leakage (no download button, no browser-native
 * save/print) but is NOT a cryptographic guarantee against a determined attacker
 * with DevTools access.
 *
 * Props:
 *   arrayBuffer    — raw document bytes (ArrayBuffer)
 *   contentType    — MIME type from the response Content-Type header
 *   title          — document name for the header (also used for extension detection)
 *   verification   — { integrityVerified, hash } or null
 *   accessLevel    — 'VIEW' | 'EDIT'
 *   onClose        — callback to close the viewer
 *   onSubmitForReview — callback(modifiedContent) for Feature 3 (optional)
 */
export default function DocumentViewerModal({
  arrayBuffer,
  contentType,
  title,
  verification,
  accessLevel,
  onClose,
  onSubmitForReview,
  onDirectEdit,
}) {
  // Block keyboard shortcuts while modal is open
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+S, Ctrl+P, Ctrl+Shift+S
      if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const handleClose = () => {
    onClose();
  };

  // Prevent clicks inside the modal from closing it
  const stopPropagation = (e) => e.stopPropagation();

  const renderer = useMemo(() => detectRenderer(contentType, title), [contentType, title]);

  // Decode ArrayBuffer to string for code viewer
  const textContent = useMemo(() => {
    if (renderer !== 'code' || !arrayBuffer) return null;
    try {
      return new TextDecoder('utf-8').decode(arrayBuffer);
    } catch {
      return null;
    }
  }, [renderer, arrayBuffer]);

  return (
    <div style={overlayStyle} onClick={handleClose} onContextMenu={(e) => e.preventDefault()}>
      <div style={modalStyle} onClick={stopPropagation}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <FileText size={20} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title || 'Document Viewer'}
            </span>
            {accessLevel && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                background: accessLevel === 'EDIT' ? 'rgba(99,102,241,0.15)' : 'rgba(72,187,120,0.15)',
                color: accessLevel === 'EDIT' ? '#6366f1' : '#38a169',
              }}>
                {accessLevel}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {verification && (
              <VerificationBadge
                integrityVerified={verification.integrityVerified}
                hash={verification.hash}
              />
            )}
            <button onClick={handleClose} style={closeBtnStyle} aria-label="Close viewer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={contentAreaStyle}>
          {renderer === 'pdf' ? (
            <SecurePDFViewer arrayBuffer={arrayBuffer} />
          ) : renderer === 'image' ? (
            <SecureImageViewer
              arrayBuffer={arrayBuffer}
              contentType={contentType}
              title={title}
            />
          ) : renderer === 'code' && textContent !== null ? (
            <SecureCodeViewer
              content={textContent}
              fileName={title}
              contentType={contentType}
              accessLevel={accessLevel || 'VIEW'}
              onSubmitForReview={onSubmitForReview}
              onDirectEdit={onDirectEdit}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem' }}>
              <FileText size={48} strokeWidth={1.2} />
              <p style={{ fontSize: '1rem' }}>Preview is not available for this file type.</p>
              <p style={{ fontSize: '0.85rem' }}>Content-Type: <code>{contentType || 'unknown'}</code></p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Shield size={14} />
                <span>Document is integrity-verified and stored securely on IPFS.</span>
              </div>
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
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  animation: 'fadeIn 0.2s ease',
};

const modalStyle = {
  width: '90vw',
  height: '90vh',
  maxWidth: '1200px',
  background: 'var(--neo-bg, #e8edf2)',
  borderRadius: '16px',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: 'scaleIn 0.25s ease',
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
  transition: 'background 0.15s',
};

const contentAreaStyle = {
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
};
