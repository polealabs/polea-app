'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Tooltip({ texto }: { texto: string }) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2 + window.scrollX,
      })
    }
  }, [show])

  return (
    <span className="relative inline-flex ml-1.5 align-middle">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="w-4 h-4 rounded-full bg-[#FBF3E0] border border-[#D4A853] inline-flex items-center justify-center text-[#D4A853] text-[9px] font-bold hover:bg-[#D4A853] hover:text-white transition flex-shrink-0"
      >
        💡
      </button>
      {show && typeof window !== 'undefined' && createPortal(
        <span
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="w-56 bg-[#1E3A2F] text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed block pointer-events-none"
        >
          {texto}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E3A2F] block" />
        </span>,
        document.body
      )}
    </span>
  )
}
