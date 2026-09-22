import React, { useEffect, useMemo } from 'react';

/**
 * Secure image viewer — creates a temporary blob URL, disables right-click,
 * and revokes the URL on unmount.
 *
 * Props:
 *   arrayBuffer — raw image bytes (ArrayBuffer)
 *   contentType — MIME type of the image
 *   title       — alt text
 */
export default function SecureImageViewer({ arrayBuffer, contentType, title }) {
  const blobUrl = useMemo(() => {
    if (!arrayBuffer) return null;
    const blob = new Blob([arrayBuffer], { type: contentType || 'image/png' });
    return URL.createObjectURL(blob);
  }, [arrayBuffer, contentType]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!blobUrl) {
    return (
      <div style={placeholderStyle}>
        <p>No image data available.</p>
      </div>
    );
  }

  return (
    <div
      style={wrapperStyle}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <img
        src={blobUrl}
        alt={title || 'Document'}
        style={imageStyle}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />

      {/* Security notice */}
      <div style={noticeStyle}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)' }}>
          🔒 In-platform viewing — right-click and drag-save disabled. This reduces casual leakage but is not a cryptographic DRM guarantee.
        </span>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const wrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  overflow: 'auto',
  padding: '1rem',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  position: 'relative',
};

const imageStyle = {
  maxWidth: '100%',
  maxHeight: 'calc(100% - 2rem)',
  objectFit: 'contain',
  borderRadius: '8px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  pointerEvents: 'none',
};

const placeholderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--text-muted, #666)',
};

const noticeStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '0.35rem 1rem',
  borderTop: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(255,255,255,0.8)',
  textAlign: 'center',
};
