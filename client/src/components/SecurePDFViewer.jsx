import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader } from 'lucide-react';

// PDF.js worker setup — loaded from CDN to avoid bundler issues
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Secure PDF viewer that renders pages to <canvas> elements.
 * No native PDF toolbar — no download/print/save icons exposed.
 *
 * Props:
 *   arrayBuffer — raw PDF bytes (ArrayBuffer)
 */
export default function SecurePDFViewer({ arrayBuffer }) {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Load the PDF document
  useEffect(() => {
    if (!arrayBuffer) return;

    let cancelled = false;
    const loadPdf = async () => {
      try {
        // Copy arrayBuffer since pdfjs transfers it
        const copy = arrayBuffer.slice(0);
        const doc = await pdfjsLib.getDocument({ data: copy }).promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[SecurePDFViewer] Failed to load PDF:', err);
          setError('Failed to load PDF document.');
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [arrayBuffer]);

  // Render the current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
    }

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[SecurePDFViewer] Render error:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  if (error) {
    return (
      <div style={errorStyle}>
        <p>{error}</p>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div style={loadingStyle}>
        <Loader size={24} className="spin-animation" />
        <span>Loading PDF…</span>
      </div>
    );
  }

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={toolbarGroupStyle}>
          <button onClick={goToPrev} disabled={currentPage <= 1} style={toolBtnStyle} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <span style={pageInfoStyle}>
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={goToNext} disabled={currentPage >= totalPages} style={toolBtnStyle} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={toolbarGroupStyle}>
          <button onClick={zoomOut} disabled={scale <= 0.5} style={toolBtnStyle} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span style={pageInfoStyle}>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3} style={toolBtnStyle} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} style={canvasContainerStyle}>
        {rendering && (
          <div style={renderingOverlayStyle}>
            <Loader size={20} className="spin-animation" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: 'block', margin: '0 auto', boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
        />
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

const toolbarGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const toolBtnStyle = {
  background: 'none',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '6px',
  padding: '0.35rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'inherit',
  transition: 'background 0.15s',
};

const pageInfoStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  minWidth: '5rem',
  textAlign: 'center',
};

const canvasContainerStyle = {
  flex: 1,
  overflow: 'auto',
  padding: '1rem',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  position: 'relative',
  background: '#f0f0f0',
};

const renderingOverlayStyle = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  zIndex: 2,
  color: 'var(--text-muted, #666)',
};

const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: '0.75rem',
  color: 'var(--text-muted, #666)',
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#e53e3e',
  padding: '2rem',
};
