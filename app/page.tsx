'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const WA_URL = 'https://wa.me/573014140381'

/* ── SVG Components ── */
function CamMark({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style}>
      <g style={{ transform: 'rotate(26deg)', transformOrigin: '50px 50px' }}>
        <path fill="currentColor" fillRule="evenodd" d="M50 9 C 65 9, 80 30, 80 54 C 80 76, 67 93, 50 93 C 33 93, 20 76, 20 54 C 20 30, 35 9, 50 9 Z M50 60 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 Z" />
      </g>
    </svg>
  )
}

function CamGhost({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style}>
      <g style={{ transform: 'rotate(26deg)', transformOrigin: '50px 50px' }}>
        <path fill="none" stroke="currentColor" strokeWidth="1.4" fillRule="evenodd" d="M50 9 C 65 9, 80 30, 80 54 C 80 76, 67 93, 50 93 C 33 93, 20 76, 20 54 C 20 30, 35 9, 50 9 Z M50 60 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 Z" />
      </g>
    </svg>
  )
}

/* ── Feature Icons ── */
function IcVentas() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M6 8h12l-1.1 12H7.1L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg> }
function IcInventario() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><rect x="3.5" y="12.5" width="7" height="7" rx="1" /><rect x="13.5" y="12.5" width="7" height="7" rx="1" /><rect x="8.5" y="4.5" width="7" height="7" rx="1" /></svg> }
function IcGastos() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><ellipse cx="10" cy="8" rx="6" ry="2.6" /><path d="M4 8v8c0 1.4 2.7 2.6 6 2.6 1 0 2-.1 2.8-.3" /><path d="M16 14v6m3-3h-6" /></svg> }
function IcReportes() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M4 4v16h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg> }
function IcAliadas() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><circle cx="9" cy="12" r="5.2" /><circle cx="15" cy="12" r="5.2" /></svg> }
function IcEventos() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M4 20L12 5l8 15" /><path d="M12 5v15" /><path d="M4 20h16" /></svg> }
function IcJoyeria() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M12 3.5l7.5 6L12 20.5 4.5 9.5 12 3.5Z" /><path d="M4.5 9.5h15" /></svg> }
function IcRopa() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M9 4l3 2 3-2 5 3.5-2.5 3-2-1.2V20H8V9.3L6 10.5 3.5 7.5 9 4Z" /></svg> }
function IcCosmeticos() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M12 3.5c3.2 4.2 5 6.4 5 9.3a5 5 0 0 1-10 0c0-2.9 1.8-5.1 5-9.3Z" /></svg> }
function IcFerreteria() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M8.5 3.5h7L20 12l-4.5 8.5h-7L4 12 8.5 3.5Z" /><circle cx="12" cy="12" r="3" /></svg> }
function IcRestaurantes() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M7 3.5v17M5 3.5v5a2 2 0 0 0 4 0v-5" /><path d="M17 3.5c-1.8 0-3 2.2-3 5s1.2 4 3 4.2V20.5" /></svg> }
function IcArtesanias() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" /></svg> }

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.background = '#F4F1EA'
    return () => { document.body.style.background = '' }
  }, [])

  return (
    <>
      <style>{`
        /* ── Leva Landing tokens ── */
        .lv{
          --crow:#0D0D0D;--graphite:#1A1A1A;--graphite-2:#202020;
          --champagne:#E8DFC4;--champ-deep:#C9BE9A;--smoke:#5A5A5A;
          --paper:#F4F1EA;--paper-2:#ECE8DE;--line:#DCD7CA;--line-dk:#262626;
          --ink:#16140F;--ink-2:#4A463C;
          --on-dark:#E8DFC4;--on-dark-2:rgba(232,223,196,0.52);
          --accent:#4A90D9;--accent-on-blk:#5C9FE0;--accent-ink:#2F6DB0;
          --accent-soft:rgba(74,144,217,0.12);--accent-soft-dk:rgba(92,159,224,0.16);
          --success:#27AE60;
          --wm:var(--font-rubik,'Rubik',system-ui,sans-serif);
          --head:var(--font-space-grotesk,system-ui,sans-serif);
          --body:var(--font-space-grotesk,system-ui,sans-serif);
          --mono:ui-monospace,'Cascadia Code','Courier New',monospace;
          --maxw:1180px;--gutter:40px;
        }
        .lv *{box-sizing:border-box}
        .lv{background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.62}
        .lv h1,.lv h2,.lv h3,.lv h4{font-family:var(--head);font-weight:600;margin:0}
        .lv p{margin:0}
        .lv a{color:inherit;text-decoration:none}

        /* wrap */
        .lv .wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter)}

        /* wordmark */
        .lv .wm{font-family:var(--wm);font-weight:700;text-transform:uppercase;letter-spacing:0.16em;padding-left:0.16em;line-height:1}

        /* buttons */
        .lv .btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--body);font-weight:600;font-size:15px;padding:13px 22px;border-radius:11px;cursor:pointer;border:1px solid transparent;transition:transform .16s ease,background .16s ease,border-color .16s ease,color .16s ease;white-space:nowrap}
        .lv .btn:active{transform:translateY(1px)}
        .lv .btn-primary{background:var(--accent);color:#1a1206;border-color:var(--accent)}
        .lv .btn-primary:hover{background:var(--accent-on-blk);border-color:var(--accent-on-blk)}
        .lv .btn-ghost-dark{background:transparent;color:var(--on-dark);border-color:rgba(232,223,196,0.28)}
        .lv .btn-ghost-dark:hover{border-color:var(--champagne);background:rgba(232,223,196,0.06)}
        .lv .btn-ghost-light{background:transparent;color:var(--ink);border-color:var(--line)}
        .lv .btn-ghost-light:hover{border-color:var(--ink);background:#fff}
        .lv .btn-sm{padding:9px 15px;font-size:13.5px;border-radius:9px}
        .lv .arr{font-family:var(--mono);font-size:0.9em}

        /* nav */
        .lv .lv-nav{position:sticky;top:0;z-index:60;border-bottom:1px solid rgba(232,223,196,0.10);transition:background .3s ease}
        .lv .nav-inner{display:flex;align-items:center;gap:24px;max-width:var(--maxw);margin:0 auto;padding:16px var(--gutter)}
        .lv .nav-brand{display:flex;align-items:center;gap:11px}
        .lv .nav-mk{width:30px;height:30px;color:var(--accent-on-blk)}
        .lv .nav-mk svg{width:100%;height:100%;display:block}
        .lv .nav-links{display:flex;gap:30px;margin:0 auto;font-size:14.5px;color:var(--on-dark-2)}
        .lv .nav-links a{transition:color .15s ease}
        .lv .nav-links a:hover{color:var(--champagne)}
        .lv .nav-cta{display:flex;align-items:center;gap:10px}
        .lv .signin{font-size:14.5px;color:var(--on-dark-2);transition:color .15s}
        .lv .signin:hover{color:var(--champagne)}

        /* hero */
        .lv .hero{position:relative;background:var(--crow);color:var(--on-dark);min-height:calc(100vh - 63px);display:flex;align-items:center;padding:64px 0 80px;overflow:hidden}
        .lv .cam-ghost{position:absolute;right:-120px;top:50%;transform:translateY(-50%);width:620px;height:620px;color:rgba(92,159,224,0.05);pointer-events:none}
        .lv .cam-ghost svg{width:100%;height:100%}
        .lv .hero-grid{position:relative;z-index:2;display:grid;grid-template-columns:1.02fr 0.98fr;gap:54px;align-items:center;width:100%}
        .lv .kicker{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--on-dark-2);border:1px solid rgba(232,223,196,0.16);border-radius:999px;padding:7px 14px}
        .lv .kicker .dot{width:7px;height:7px;border-radius:50%;background:var(--accent-on-blk)}
        .lv .hero h1{font-family:var(--head);font-weight:600;font-size:clamp(44px,6.4vw,82px);line-height:1.0;letter-spacing:-0.03em;color:var(--champagne);margin:26px 0 0;max-width:13ch}
        .lv .hero h1 .soft{color:var(--accent-on-blk)}
        .lv .hero .sub{font-size:clamp(17px,2vw,20px);line-height:1.6;color:var(--on-dark-2);margin:26px 0 0;max-width:42ch}
        .lv .hero .actions{display:flex;gap:14px;margin-top:38px;flex-wrap:wrap}
        .lv .hero .trust{display:flex;align-items:center;gap:14px;margin-top:30px;flex-wrap:wrap;font-family:var(--mono);font-size:11.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--on-dark-2)}
        .lv .hero .trust .sep{width:4px;height:4px;border-radius:50%;background:rgba(232,223,196,0.3)}

        /* entrance */
        .lv .reveal{opacity:1;transform:none}
        @media(prefers-reduced-motion:no-preference){
          .lv .reveal{animation:lvRise .7s cubic-bezier(.2,.7,.2,1) backwards}
          .lv .d1{animation-delay:.04s}.lv .d2{animation-delay:.14s}.lv .d3{animation-delay:.24s}
          .lv .d4{animation-delay:.34s}.lv .d5{animation-delay:.46s}
        }
        @keyframes lvRise{from{transform:translateY(16px)}to{transform:none}}

        /* dashboard mockup */
        .lv .dash{position:relative;background:var(--graphite);border:1px solid #2b2b2b;border-radius:20px;padding:22px;box-shadow:0 50px 90px -40px rgba(0,0,0,0.7)}
        .lv .dwin{display:flex;align-items:center;gap:9px;margin-bottom:20px}
        .lv .dwin i{width:10px;height:10px;border-radius:50%;background:#3a3a3a;display:block}
        .lv .durl{margin-left:auto;font-family:var(--mono);font-size:11px;color:#6a655a;background:#111;border-radius:6px;padding:5px 12px;letter-spacing:0.04em}
        .lv .dtop{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}
        .lv .dk{font-family:var(--mono);font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;color:#7c766a}
        .lv .dbig{font-family:var(--head);font-weight:600;font-size:34px;letter-spacing:-0.02em;color:var(--champagne);margin-top:6px}
        .lv .dchg{font-size:13px;font-weight:600;color:var(--accent-on-blk);margin-top:4px}
        .lv .dutil{text-align:right}
        .lv .duk{font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#7c766a}
        .lv .duv{font-family:var(--head);font-weight:600;font-size:19px;color:var(--success);margin-top:5px}
        .lv .bars{display:flex;align-items:flex-end;gap:8px;height:88px;margin:6px 0 20px}
        .lv .bars i{flex:1;background:rgba(232,223,196,0.10);border-radius:4px 4px 0 0}
        .lv .bars i.on{background:var(--accent)}
        .lv .drow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .lv .mini{background:#151515;border:1px solid #262626;border-radius:13px;padding:14px 15px}
        .lv .mk2{font-family:var(--mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#7c766a}
        .lv .mv{font-family:var(--head);font-weight:600;font-size:19px;margin-top:7px;color:var(--champagne)}
        .lv .mv.pos{color:var(--success)}
        .lv .dlist{background:#151515;border:1px solid #262626;border-radius:13px;padding:4px 15px}
        .lv .dli{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid #232323;font-size:13.5px}
        .lv .dli:last-child{border-bottom:none}
        .lv .dlt{color:#cfc9ba}
        .lv .dch{font-family:var(--mono);font-size:10px;color:#7c766a;margin-left:8px;letter-spacing:0.04em}
        .lv .dlr{font-weight:600;color:var(--champagne)}
        .lv .dash-chip{position:absolute;background:var(--crow);border:1px solid #2c2c2c;border-radius:12px;padding:11px 14px;box-shadow:0 20px 40px -18px rgba(0,0,0,0.8);display:flex;align-items:center;gap:10px}
        .lv .dci{width:30px;height:30px;border-radius:8px;background:var(--accent-soft-dk);color:var(--accent-on-blk);display:flex;align-items:center;justify-content:center}
        .lv .dci svg{width:16px;height:16px}
        .lv .dck{font-family:var(--mono);font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:#7c766a}
        .lv .dcv{font-family:var(--head);font-weight:600;font-size:15px;color:var(--champagne);margin-top:1px}
        .lv .chip-tl{top:-22px;left:-26px}
        .lv .chip-br{bottom:-24px;right:-22px}

        /* sections */
        .lv .band{padding:108px 0;border-bottom:1px solid var(--line)}
        .lv .sec-head{max-width:62ch}
        .lv .idx{font-family:var(--mono);font-size:12px;letter-spacing:0.14em;color:var(--accent-ink);text-transform:uppercase}
        .lv .sec-head h2{font-family:var(--head);font-weight:600;font-size:clamp(30px,4vw,46px);line-height:1.05;letter-spacing:-0.025em;color:var(--ink);margin:18px 0 0}
        .lv .lede{font-size:18px;line-height:1.6;color:var(--ink-2);margin:20px 0 0;max-width:54ch}
        .lv .sec-head.center{margin:0 auto;text-align:center}
        .lv .sec-head.center .lede{margin-left:auto;margin-right:auto}

        /* problema */
        .lv .prob-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:54px}
        .lv .prob{background:#fff;border:1px solid var(--line);border-radius:16px;padding:30px 28px 28px;display:flex;flex-direction:column}
        .lv .prob .q{font-family:var(--head);font-weight:600;font-size:21px;line-height:1.22;letter-spacing:-0.01em;color:var(--ink);padding-bottom:22px}
        .lv .prob .pain{font-size:14.5px;color:var(--ink-2);line-height:1.55;padding-bottom:22px}
        .lv .sol{margin-top:auto;border-top:1px solid var(--line);padding-top:20px;display:flex;gap:13px;align-items:flex-start}
        .lv .sol .badge{flex-shrink:0;font-family:var(--mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-ink);background:var(--accent-soft);border-radius:6px;padding:5px 8px;margin-top:2px}
        .lv .stext{font-size:14.5px;color:var(--ink);line-height:1.5}
        .lv .stext b{color:var(--ink);font-weight:600}

        /* funciones */
        .lv .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-top:54px}
        .lv .feat{background:var(--paper);padding:34px 30px;transition:background .18s ease}
        .lv .feat:hover{background:#fff}
        .lv .fi{width:46px;height:46px;border-radius:12px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center}
        .lv .feat h3{font-family:var(--head);font-weight:600;font-size:19px;letter-spacing:-0.01em;margin:20px 0 8px;color:var(--ink)}
        .lv .feat p{font-size:14.5px;color:var(--ink-2);line-height:1.55}

        /* pasos */
        .lv .dark-band{background:var(--crow);color:var(--on-dark);border-bottom:none}
        .lv .dark-band .sec-head h2{color:var(--champagne)}
        .lv .dark-band .idx{color:var(--accent-on-blk)}
        .lv .dark-band .lede{color:var(--on-dark-2)}
        .lv .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:56px;position:relative}
        .lv .step .n{font-family:var(--head);font-weight:600;font-size:15px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(232,223,196,0.22);display:flex;align-items:center;justify-content:center;color:var(--accent-on-blk)}
        .lv .step h3{font-family:var(--head);font-weight:600;font-size:22px;letter-spacing:-0.01em;color:var(--champagne);margin:22px 0 10px}
        .lv .step > p{font-size:15px;color:var(--on-dark-2);line-height:1.6;max-width:34ch}
        .lv .line-link{position:absolute;top:21px;left:54px;right:-22px;height:1px;background:repeating-linear-gradient(90deg,rgba(232,223,196,0.22) 0 6px,transparent 6px 12px)}

        /* industrias */
        .lv .ind-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:50px}
        .lv .ind{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;display:flex;align-items:center;gap:16px;transition:border-color .16s,transform .16s;cursor:default}
        .lv .ind:hover{border-color:var(--accent);transform:translateY(-2px)}
        .lv .ii{width:40px;height:40px;border-radius:10px;background:var(--graphite);color:var(--accent-on-blk);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .lv .it{font-family:var(--head);font-weight:600;font-size:17px;color:var(--ink);display:block}
        .lv .ic{font-family:var(--mono);font-size:11px;color:var(--smoke);letter-spacing:0.04em;margin-top:2px;display:block}
        .lv .photos{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:14px;margin-top:50px}
        .lv .ph-tall{height:300px;background:#e8e3da;border-radius:14px;display:flex;align-items:center;justify-content:center}
        .lv .ph-sq{height:300px;background:#e8e3da;border-radius:14px;display:flex;align-items:center;justify-content:center}
        .lv .photo-note{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--smoke);margin-top:16px}

        /* prueba social */
        .lv .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
        .lv .metric{border-top:2px solid var(--ink);padding-top:20px}
        .lv .mn{font-family:var(--head);font-weight:600;font-size:clamp(38px,5vw,54px);letter-spacing:-0.03em;color:var(--ink);line-height:1}
        .lv .ml{font-size:14.5px;color:var(--ink-2);margin-top:10px;max-width:26ch}
        .lv .testi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:30px}
        .lv .testi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:30px 30px 26px}
        .lv .quote{font-family:var(--head);font-weight:500;font-size:20px;line-height:1.4;letter-spacing:-0.01em;color:var(--ink)}
        .lv .by{display:flex;align-items:center;gap:13px;margin-top:24px}
        .lv .av{width:42px;height:42px;border-radius:50%;background:var(--graphite);color:var(--champagne);display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:600;font-size:15px;flex-shrink:0}
        .lv .who .nm{font-weight:600;font-size:14.5px;color:var(--ink);display:block}
        .lv .who .role{font-family:var(--mono);font-size:11px;color:var(--smoke);letter-spacing:0.03em;margin-top:2px;display:block}
        .lv .eg-tag{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--smoke);border:1px solid var(--line);border-radius:999px;padding:5px 12px;margin-top:22px}
        .lv .eg-dot{width:6px;height:6px;border-radius:50%;background:var(--champ-deep)}

        /* precios */
        .lv .price-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:54px;max-width:880px;margin-left:auto;margin-right:auto}
        .lv .plan{border:1px solid var(--line);border-radius:20px;background:#fff;padding:34px 32px;display:flex;flex-direction:column}
        .lv .plan.pro{background:var(--crow);border-color:var(--crow);color:var(--on-dark)}
        .lv .pname{font-family:var(--mono);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:var(--smoke)}
        .lv .plan.pro .pname{color:var(--accent-on-blk)}
        .lv .price-num{font-family:var(--head);font-weight:600;font-size:44px;letter-spacing:-0.03em;color:var(--ink);margin:16px 0 2px;line-height:1}
        .lv .plan.pro .price-num{color:var(--champagne)}
        .lv .price-num small{font-family:var(--body);font-size:15px;font-weight:400;color:var(--smoke);letter-spacing:0}
        .lv .plan.pro .price-num small{color:var(--on-dark-2)}
        .lv .pdesc{font-size:14.5px;color:var(--ink-2);margin-top:12px;min-height:44px}
        .lv .plan.pro .pdesc{color:var(--on-dark-2)}
        .lv .plan ul{list-style:none;padding:0;margin:24px 0 28px;display:flex;flex-direction:column;gap:13px}
        .lv .plan li{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;color:var(--ink)}
        .lv .plan.pro li{color:var(--champagne)}
        .lv .ck{color:var(--accent-ink);flex-shrink:0;margin-top:1px;font-weight:700}
        .lv .plan.pro .ck{color:var(--accent-on-blk)}
        .lv .plan .btn{margin-top:auto;justify-content:center}
        .lv .badge-pro{font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#1a1206;background:var(--accent-on-blk);border-radius:6px;padding:4px 9px;align-self:flex-start;margin-bottom:14px;display:inline-block}
        .lv .price-foot{text-align:center;font-family:var(--mono);font-size:11.5px;letter-spacing:0.04em;color:var(--smoke);margin-top:26px}

        /* CTA final */
        .lv .cta-final{background:var(--crow);color:var(--on-dark);text-align:center;padding:120px 0;position:relative;overflow:hidden}
        .lv .cta-ghost{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;height:520px;color:rgba(92,159,224,0.05)}
        .lv .cta-ghost svg{width:100%;height:100%}
        .lv .cta-inner{position:relative;z-index:2}
        .lv .cta-final h2{font-family:var(--head);font-weight:600;font-size:clamp(34px,5vw,62px);line-height:1.02;letter-spacing:-0.03em;color:var(--champagne);max-width:16ch;margin:0 auto}
        .lv .cta-final > .cta-inner > p{font-size:18px;color:var(--on-dark-2);margin:22px auto 0;max-width:44ch}
        .lv .cta-final .actions{display:flex;gap:14px;justify-content:center;margin-top:38px;flex-wrap:wrap}
        .lv .reassure{font-family:var(--mono);font-size:11.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--on-dark-2);margin-top:28px}

        /* footer */
        .lv .foot{background:var(--crow);color:var(--on-dark);padding:70px 0 46px;border-top:1px solid var(--line-dk)}
        .lv .foot-top{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:32px;padding-bottom:48px;border-bottom:1px solid var(--line-dk)}
        .lv .pbrand{display:flex;align-items:center;gap:11px;margin-bottom:16px}
        .lv .pmk{width:30px;height:30px;color:var(--champagne)}
        .lv .pmk svg{width:100%;height:100%}
        .lv .pblurb{font-size:14px;color:var(--on-dark-2);line-height:1.6;max-width:32ch}
        .lv .made{font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:#6a655a;margin-top:18px}
        .lv .fcol h4{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6a655a;font-weight:400;margin-bottom:16px}
        .lv .fcol a{display:block;font-size:14px;color:var(--on-dark-2);padding:6px 0;transition:color .15s}
        .lv .fcol a:hover{color:var(--champagne)}
        .lv .foot-bot{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:26px;flex-wrap:wrap}
        .lv .copy{font-family:var(--mono);font-size:11.5px;color:#6a655a;letter-spacing:0.04em}
        .lv .socials{display:flex;gap:10px}
        .lv .socials a{width:34px;height:34px;border-radius:9px;border:1px solid var(--line-dk);display:flex;align-items:center;justify-content:center;color:var(--on-dark-2);transition:all .15s}
        .lv .socials a:hover{border-color:var(--champagne);color:var(--champagne)}
        .lv .socials svg{width:16px;height:16px}

        /* mobile nav */
        .lv .mobile-menu{display:none;background:#111;border-top:1px solid rgba(232,223,196,0.10);padding:16px 40px 24px}
        .lv .mobile-menu a{display:block;font-size:15px;color:rgba(232,223,196,0.52);padding:12px 0;transition:color .15s}
        .lv .mobile-menu a:hover{color:var(--champagne)}
        .lv .mobile-menu .mrow{display:flex;gap:24px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(232,223,196,0.10)}
        .lv .nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:5px}
        .lv .nav-toggle span{display:block;width:22px;height:1px;background:var(--champagne)}

        /* responsive */
        @media(max-width:940px){ .lv .hero-grid{grid-template-columns:1fr;gap:44px} }
        @media(max-width:880px){ .lv .nav-links{display:none} .lv .signin{display:none} .lv .nav-toggle{display:flex} .lv .mobile-menu{display:block} }
        @media(max-width:860px){ .lv .prob-grid{grid-template-columns:1fr} .lv .feat-grid{grid-template-columns:repeat(2,1fr)} .lv .steps{grid-template-columns:1fr} .lv .line-link{display:none} .lv .ind-grid{grid-template-columns:repeat(2,1fr)} .lv .testi-grid{grid-template-columns:1fr} }
        @media(max-width:760px){ .lv .band{padding:76px 0} .lv .cta-final{padding:88px 0} .lv .foot-top{grid-template-columns:1fr 1fr} .lv .photos{grid-template-columns:1fr 1fr} .lv .ph-tall{grid-column:1/-1;height:240px} .lv .ph-sq{height:180px} }
        @media(max-width:720px){ .lv .price-grid{grid-template-columns:1fr} }
        @media(max-width:680px){ .lv .metrics{grid-template-columns:1fr} .lv{--gutter:22px} }
        @media(max-width:560px){ .lv .feat-grid{grid-template-columns:1fr} .lv .ind-grid{grid-template-columns:1fr} }
        @media(max-width:520px){ .lv .dash-chip{display:none} }
        @media(max-width:480px){ .lv .foot-top{grid-template-columns:1fr} }
      `}</style>

      <div className="lv">

        {/* ════════ NAV ════════ */}
        <header
          className="lv-nav"
          style={{ background: scrolled ? 'rgba(13,13,13,0.92)' : 'rgba(13,13,13,0.72)', backdropFilter: 'blur(14px)' }}
        >
          <div className="nav-inner">
            <Link href="/" className="nav-brand" aria-label="Leva — inicio">
              <span className="nav-mk"><CamMark /></span>
              <span className="wm" style={{ fontSize: 21, color: 'var(--champagne)' }}>Leva</span>
            </Link>

            <nav className="nav-links">
              <a href="#problema">Por qué Leva</a>
              <a href="#funciones">Funciones</a>
              <a href="#como">Cómo funciona</a>
              <a href="#precios">Precios</a>
            </nav>

            <div className="nav-cta">
              <Link href="/login" className="signin">Entrar</Link>
              <Link href="/registro" className="btn btn-primary btn-sm">Prueba gratis</Link>
            </div>

            <button
              type="button"
              className="nav-toggle"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span /><span />
            </button>
          </div>

          {mobileOpen && (
            <div className="mobile-menu">
              <a href="#problema" onClick={() => setMobileOpen(false)}>Por qué Leva</a>
              <a href="#funciones" onClick={() => setMobileOpen(false)}>Funciones</a>
              <a href="#como" onClick={() => setMobileOpen(false)}>Cómo funciona</a>
              <a href="#precios" onClick={() => setMobileOpen(false)}>Precios</a>
              <div className="mrow">
                <Link href="/login" style={{ color: 'rgba(232,223,196,0.52)', fontSize: 14 }}>Entrar</Link>
                <Link href="/registro" style={{ color: 'var(--accent-on-blk)', fontSize: 14 }}>Prueba gratis →</Link>
              </div>
            </div>
          )}
        </header>

        {/* ════════ HERO ════════ */}
        <section className="hero" id="top">
          <div className="cam-ghost"><CamGhost /></div>
          <div className="wrap">
            <div className="hero-grid">

              {/* copy */}
              <div className="hero-copy">
                <span className="kicker reveal d1">
                  <span className="dot" />
                  Un producto de Polea · Hecho en Cali
                </span>
                <h1 className="reveal d2">
                  Tu negocio,<br /><span className="soft">sin enredos.</span>
                </h1>
                <p className="sub reveal d3">
                  Registra ventas, controla tu inventario y conoce tu ganancia real. Todo en un solo lugar — diseñado para tiendas colombianas que venden por WhatsApp, Instagram y en su local.
                </p>
                <div className="actions reveal d4">
                  <Link href="/registro" className="btn btn-primary">Prueba gratis <span className="arr">→</span></Link>
                  <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">Ver demo</a>
                </div>
                <div className="trust reveal d5">
                  <span>Sin tarjeta</span><span className="sep" />
                  <span>Listo en 5 minutos</span><span className="sep" />
                  <span>En español</span>
                </div>
              </div>

              {/* dashboard mockup */}
              <div className="hero-visual reveal d4">
                <div className="dash">
                  <div className="dwin">
                    <i /><i /><i />
                    <span className="durl">app.leva.co</span>
                  </div>
                  <div className="dtop">
                    <div>
                      <div className="dk">Ventas de mayo</div>
                      <div className="dbig">$4.850.000</div>
                      <div className="dchg">↑ 12% vs. abril</div>
                    </div>
                    <div className="dutil">
                      <div className="duk">Utilidad real</div>
                      <div className="duv">$1.920.000</div>
                    </div>
                  </div>
                  <div className="bars">
                    <i style={{ height: '38%' }} /><i style={{ height: '54%' }} /><i style={{ height: '42%' }} />
                    <i style={{ height: '66%' }} /><i style={{ height: '50%' }} /><i style={{ height: '74%' }} />
                    <i className="on" style={{ height: '100%' }} /><i style={{ height: '60%' }} />
                  </div>
                  <div className="drow">
                    <div className="mini"><div className="mk2">Flujo de caja</div><div className="mv pos">+ $1.920.000</div></div>
                    <div className="mini"><div className="mk2">En inventario</div><div className="mv">$8.340.000</div></div>
                  </div>
                  <div className="dlist">
                    <div className="dli"><span className="dlt">Anillo oro 18k <span className="dch">WhatsApp</span></span><span className="dlr">$320.000</span></div>
                    <div className="dli"><span className="dlt">Aretes perla <span className="dch">Local</span></span><span className="dlr">$95.000</span></div>
                    <div className="dli"><span className="dlt">Cadena plata <span className="dch">Instagram</span></span><span className="dlr">$140.000</span></div>
                  </div>
                  {/* floating chips */}
                  <div className="dash-chip chip-tl">
                    <span className="dci"><IcReportes /></span>
                    <span><div className="dck">Margen</div><div className="dcv">39,6 %</div></span>
                  </div>
                  <div className="dash-chip chip-br">
                    <span className="dci"><IcInventario /></span>
                    <span><div className="dck">Stock bajo</div><div className="dcv">3 productos</div></span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ════════ 01 · PROBLEMA ════════ */}
        <section className="band" id="problema">
          <div className="wrap">
            <div className="sec-head">
              <span className="idx">01 — El problema</span>
              <h2>Llevas el negocio en la cabeza. Y eso cansa.</h2>
              <p className="lede">Vendes por WhatsApp, por Instagram y en el local. Pero a fin de mes, las cuentas claras no aparecen por ningún lado. Leva las pone frente a ti.</p>
            </div>
            <div className="prob-grid">
              <article className="prob">
                <div className="q">¿Sabes cuánto ganaste este mes?</div>
                <p className="pain">No es lo que entró a la caja. Es lo que de verdad te quedó después de costos y gastos — y casi nunca alcanza el tiempo para sacar la cuenta.</p>
                <div className="sol"><span className="badge">Leva</span><span className="stext">Tu <b>utilidad real</b> calculada sola, cada día. Sin Excel, sin adivinar.</span></div>
              </article>
              <article className="prob">
                <div className="q">¿Cuánto tienes en inventario?</div>
                <p className="pain">Plata quieta en mercancía que no rota, o quedarte sin lo que más se vende justo cuando el cliente lo pide. Las dos cosas duelen.</p>
                <div className="sol"><span className="badge">Leva</span><span className="stext">Sabes <b>qué tienes, qué rota y qué reponer</b> — con alertas de stock bajo.</span></div>
              </article>
              <article className="prob">
                <div className="q">¿Cuánto gastaste de verdad?</div>
                <p className="pain">Arriendo, proveedores, domicilios, datos del celular. Gastos pequeños que sumados se comen la ganancia sin que te des cuenta.</p>
                <div className="sol"><span className="badge">Leva</span><span className="stext">Cada gasto registrado y <b>restado a tu ganancia</b>, para que no haya sorpresas.</span></div>
              </article>
            </div>
          </div>
        </section>

        {/* ════════ 02 · FUNCIONES ════════ */}
        <section className="band" id="funciones">
          <div className="wrap">
            <div className="sec-head">
              <span className="idx">02 — Funciones</span>
              <h2>Todo tu negocio, en seis módulos.</h2>
              <p className="lede">Lo justo y necesario para una tienda que crece. Nada de menús infinitos ni palabras de contador.</p>
            </div>
            <div className="feat-grid">
              {[
                { icon: <IcVentas />, t: 'Ventas', d: 'Registra cada venta en segundos, por canal y por producto. WhatsApp, Instagram o local — todo cuenta en el mismo lugar.' },
                { icon: <IcInventario />, t: 'Inventario', d: 'Qué tienes, qué se mueve y qué reponer. Cada venta descuenta del stock sola, con alertas cuando algo se está acabando.' },
                { icon: <IcGastos />, t: 'Gastos', d: 'Arriendo, proveedores, domicilios. Anota cada salida y míralas restadas a tu ganancia, sin cuentas a mano.' },
                { icon: <IcReportes />, t: 'Reportes P&L', d: 'Pérdidas y ganancias en lenguaje claro. Cuánto vendiste, cuánto gastaste y cuánto te quedó — listo para mirar.' },
                { icon: <IcAliadas />, t: 'Tiendas aliadas', d: 'Trabajas con otra tienda o dejas mercancía en consignación. Lleva la cuenta de lo tuyo en cada punto, sin enredos.' },
                { icon: <IcEventos />, t: 'Eventos y ferias', d: 'Saca tu inventario a una feria y vuelve con las cuentas cuadradas. Mide cuánto vendiste y cuánto te dejó cada evento.' },
              ].map((f) => (
                <div key={f.t} className="feat">
                  <div className="fi">{f.icon}</div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 03 · CÓMO FUNCIONA ════════ */}
        <section className="band dark-band" id="como">
          <div className="wrap">
            <div className="sec-head">
              <span className="idx">03 — Cómo funciona</span>
              <h2>Tres pasos. Cinco minutos al día.</h2>
              <p className="lede">No necesitas saber de contabilidad. Si sabes usar WhatsApp, sabes usar Leva.</p>
            </div>
            <div className="steps">
              <div className="step" style={{ position: 'relative' }}>
                <div className="line-link" />
                <div className="n">1</div>
                <h3>Registra tus ventas</h3>
                <p>Apenas vendes, lo anotas en segundos. Por canal, por producto, en efectivo o transferencia.</p>
              </div>
              <div className="step" style={{ position: 'relative' }}>
                <div className="line-link" />
                <div className="n">2</div>
                <h3>Controla tu inventario</h3>
                <p>Leva descuenta del stock solo y te avisa cuando algo se está agotando. Siempre sabes qué tienes.</p>
              </div>
              <div className="step">
                <div className="n">3</div>
                <h3>Ve tus ganancias reales</h3>
                <p>Abres la app y ahí está: lo que vendiste, lo que gastaste y lo que de verdad te quedó.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 04 · PARA QUIÉN ════════ */}
        <section className="band" id="paraquien">
          <div className="wrap">
            <div className="sec-head">
              <span className="idx">04 — Para quién es</span>
              <h2>Hecho para tu tipo de negocio.</h2>
              <p className="lede">Si vendes producto y necesitas saber cuánto ganas, Leva es para ti. Estas son las tiendas que más lo usan.</p>
            </div>
            <div className="ind-grid">
              {[
                { icon: <IcJoyeria />, t: 'Joyería', sub: 'oro, plata, accesorios' },
                { icon: <IcRopa />, t: 'Ropa', sub: 'boutiques y showrooms' },
                { icon: <IcCosmeticos />, t: 'Cosméticos', sub: 'maquillaje y cuidado' },
                { icon: <IcFerreteria />, t: 'Ferretería', sub: 'herramientas e insumos' },
                { icon: <IcRestaurantes />, t: 'Restaurantes', sub: 'cocinas y cafés' },
                { icon: <IcArtesanias />, t: 'Artesanías', sub: 'hecho a mano' },
              ].map((ind) => (
                <div key={ind.t} className="ind">
                  <span className="ii">{ind.icon}</span>
                  <span>
                    <span className="it">{ind.t}</span>
                    <span className="ic">{ind.sub}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="photos">
              <div className="ph-tall">
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--smoke)', letterSpacing: '0.1em' }}>Foto · dueña de tienda</span>
              </div>
              <div className="ph-sq">
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--smoke)', letterSpacing: '0.1em' }}>Foto · producto</span>
              </div>
              <div className="ph-sq">
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--smoke)', letterSpacing: '0.1em' }}>Foto · local</span>
              </div>
            </div>
            <p className="photo-note">↑ Reemplaza con fotos reales de comerciantes — luz natural, fondo del local, sin stock genérico.</p>
          </div>
        </section>

        {/* ════════ 05 · PRUEBA SOCIAL ════════ */}
        <section className="band" id="historias">
          <div className="wrap">
            <div className="sec-head">
              <span className="idx">05 — Historias</span>
              <h2>Negocios que ya tienen las cuentas claras.</h2>
            </div>
            <div className="metrics">
              <div className="metric"><div className="mn">+2.400</div><div className="ml">negocios activos en Colombia</div></div>
              <div className="metric"><div className="mn">$18.000M</div><div className="ml">en ventas registradas con Leva</div></div>
              <div className="metric"><div className="mn">5 min</div><div className="ml">al día, en promedio, es todo lo que toma</div></div>
            </div>
            <div className="testi-grid">
              <figure className="testi" style={{ margin: 0 }}>
                <div className="quote">&ldquo;Por primera vez sé cuánto gano de verdad. Antes creía que me iba bien y la plata no aparecía. Ahora veo en qué se me iba.&rdquo;</div>
                <figcaption className="by">
                  <span className="av">M</span>
                  <span className="who"><span className="nm">Marcela R.</span><span className="role">Joyería · Cali</span></span>
                </figcaption>
              </figure>
              <figure className="testi" style={{ margin: 0 }}>
                <div className="quote">&ldquo;Dejé los cuadernos y tres grupos de WhatsApp. Todo está en un solo lugar y mi socio ve lo mismo que yo.&rdquo;</div>
                <figcaption className="by">
                  <span className="av">J</span>
                  <span className="who"><span className="nm">Julián O.</span><span className="role">Ropa · Medellín</span></span>
                </figcaption>
              </figure>
            </div>
            <span className="eg-tag"><span className="eg-dot" />Métricas e historias de ejemplo · reemplazar con datos reales</span>
          </div>
        </section>

        {/* ════════ 06 · PRECIOS ════════ */}
        <section className="band" id="precios">
          <div className="wrap">
            <div className="sec-head center">
              <span className="idx">06 — Precios</span>
              <h2>Empieza gratis. Crece cuando quieras.</h2>
              <p className="lede">Sin contratos ni letra pequeña. Prueba todo lo que necesitas sin pagar un peso.</p>
            </div>
            <div className="price-grid">
              <div className="plan">
                <div className="pname">Plan Gratis</div>
                <div className="price-num">$0<small> / siempre</small></div>
                <p className="pdesc">Para arrancar a poner las cuentas en orden hoy mismo.</p>
                <ul>
                  <li><span className="ck">✓</span> Registro de ventas ilimitado</li>
                  <li><span className="ck">✓</span> Control de inventario básico</li>
                  <li><span className="ck">✓</span> Reporte de ganancia del mes</li>
                  <li><span className="ck">✓</span> Un usuario</li>
                </ul>
                <Link href="/registro" className="btn btn-ghost-light">Crear cuenta gratis</Link>
              </div>
              <div className="plan pro">
                <span className="badge-pro">Recomendado</span>
                <div className="pname">Plan Pro</div>
                <div className="price-num">$39.900<small> / mes</small></div>
                <p className="pdesc">Para el negocio que ya rueda y quiere ver más a fondo.</p>
                <ul>
                  <li><span className="ck">✓</span> Todo lo del plan Gratis</li>
                  <li><span className="ck">✓</span> Reportes P&amp;L y flujo de caja</li>
                  <li><span className="ck">✓</span> Tiendas aliadas y eventos</li>
                  <li><span className="ck">✓</span> Varios usuarios y respaldo</li>
                </ul>
                <Link href="/registro" className="btn btn-primary">Empezar prueba de 14 días</Link>
              </div>
            </div>
            <p className="price-foot">Precios de referencia (placeholder) · ajustar al lanzar</p>
          </div>
        </section>

        {/* ════════ 07 · CTA FINAL ════════ */}
        <section className="cta-final" id="demo">
          <div className="cta-ghost"><CamGhost /></div>
          <div className="cta-inner wrap">
            <h2>Empieza hoy gratis.</h2>
            <p>Tu negocio, sin enredos — y con las cuentas claras desde la primera venta.</p>
            <div className="actions">
              <Link href="/registro" className="btn btn-primary">Prueba gratis <span className="arr">→</span></Link>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">Hablar con nosotros</a>
            </div>
            <p className="reassure">Sin tarjeta · Sin contratos · Cancela cuando quieras</p>
          </div>
        </section>

        {/* ════════ FOOTER ════════ */}
        <footer className="foot">
          <div className="wrap">
            <div className="foot-top">
              <div className="fcol">
                <div className="pbrand">
                  <span className="pmk"><CamMark /></span>
                  <span className="wm" style={{ fontSize: 19, color: 'var(--champagne)', letterSpacing: '0.18em' }}>Polea</span>
                </div>
                <p className="pblurb">Tecnología que multiplica el esfuerzo del emprendedor latinoamericano. Leva es nuestro primer producto.</p>
                <p className="made">Cali, Colombia · 2026</p>
              </div>
              <div className="fcol">
                <h4>Producto</h4>
                <a href="#funciones">Funciones</a>
                <a href="#como">Cómo funciona</a>
                <a href="#precios">Precios</a>
                <a href="#">Descargar app</a>
              </div>
              <div className="fcol">
                <h4>Empresa</h4>
                <a href="#">Sobre Polea</a>
                <a href="#">Blog</a>
                <a href="#">Trabaja con nosotros</a>
                <a href="#">Contacto</a>
              </div>
              <div className="fcol">
                <h4>Soporte</h4>
                <a href="#">Centro de ayuda</a>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a href="#">Términos</a>
                <a href="#">Privacidad</a>
              </div>
            </div>
            <div className="foot-bot">
              <span className="copy">© 2026 Polea S.A.S. · Leva® es un producto de Polea.</span>
              <div className="socials">
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></svg>
                </a>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6L4 20Z" /></svg>
                </a>
                <a href="#" aria-label="TikTok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46" /><path d="M14 4c.6 2.3 2.2 3.8 4.5 4" /></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
