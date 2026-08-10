import React, { useState } from "react";
import LOGO from "../assets/logo.png";
 
const styles = `
  .ep-root{
    --forest-dark:#0B3D2E;
    --forest:#12523B;
    --green:#1F9D6B;
    --green-light:#5CC79A;
    --clay:#1F9D6B;
    --cream:#FFFFFF;
    --ink:#0E211B;
    --slate:#4A5C57;
    --line: rgba(11,61,46,0.12);
    --shadow: 0 20px 50px rgba(11,61,46,0.18);
    font-family:'Inter', sans-serif;
    color:var(--ink);
    background:var(--cream);
    -webkit-font-smoothing:antialiased;
  }
  .ep-root *{box-sizing:border-box;}
  .ep-root a{text-decoration:none; color:inherit;}
  .ep-root ul{list-style:none; margin:0; padding:0;}
  .ep-root img{max-width:100%; display:block;}
 
  .ep-container{max-width:1240px; margin:0 auto; padding:0 32px;}
 
  /* NAV */
  .ep-header{position:sticky; top:0; z-index:100; background:rgba(250,250,246,0.85); backdrop-filter:blur(10px); border-bottom:1px solid var(--line);}
  .ep-nav{display:flex; align-items:center; justify-content:space-between; padding:18px 0;}
  .ep-logo{display:flex; align-items:center; gap:10px; font-family:'Fraunces', serif; font-weight:600; font-size:22px; letter-spacing:-0.01em;}
  .ep-logo-mark{width:38px; height:38px; border-radius:50%; background:conic-gradient(from 90deg, var(--green), var(--green-light), var(--forest), var(--green)); display:flex; align-items:center; justify-content:center; position:relative; flex-shrink:0;}
  .ep-logo-mark svg{width:22px; height:22px;}
  .ep-logo span{color:var(--clay);}
 
  .ep-nav-links{display:flex; align-items:center; gap:36px;}
  .ep-nav-links a{font-size:15px; font-weight:500; color:var(--forest-dark); position:relative; padding:4px 0;}
  .ep-nav-links a::after{content:''; position:absolute; left:0; bottom:-2px; width:0; height:2px; background:var(--clay); transition:width .25s ease;}
  .ep-nav-links a:hover::after{width:100%;}
 
  .ep-nav-actions{display:flex; align-items:center; gap:14px;}
  .ep-btn{display:inline-flex; align-items:center; justify-content:center; padding:11px 22px; border-radius:100px; font-size:14px; font-weight:600; cursor:pointer; border:none; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; white-space:nowrap;}
  .ep-btn-ghost{background:transparent; color:var(--forest-dark); border:1.5px solid var(--line);}
  .ep-btn-ghost:hover{border-color:var(--forest-dark); background:rgba(11,61,46,0.05);}
  .ep-btn-primary{background:var(--clay); color:#fff; box-shadow:0 8px 20px rgba(31,157,107,0.35);}
  .ep-btn-primary:hover{transform:translateY(-2px); box-shadow:0 12px 26px rgba(31,157,107,0.45);}
  .ep-btn-outline-light{background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.65);}
  .ep-btn-outline-light:hover{background:rgba(255,255,255,0.12); border-color:#fff;}
 
  .ep-burger{display:none; flex-direction:column; gap:5px; cursor:pointer; background:none; border:none;}
  .ep-burger span{width:24px; height:2px; background:var(--forest-dark);}
  .ep-mobile-menu{display:none; position:absolute; top:64px; left:0; right:0; background:var(--cream); flex-direction:column; padding:24px 32px; gap:18px; border-bottom:1px solid var(--line);}
  .ep-mobile-menu.open{display:flex;}
  .ep-mobile-menu a{font-size:15px; font-weight:500; color:var(--forest-dark);}
 
  /* HERO */
  .ep-hero{position:relative; min-height:88vh; display:flex; align-items:center; overflow:hidden;
    background:
      linear-gradient(180deg, rgba(6,26,20,0.25) 0%, rgba(6,26,20,0.6) 100%),
      url('https://t4.ftcdn.net/jpg/04/58/90/65/360_F_458906503_UcIhpbqm0fI3uEb4IDCPwH5f1h59KkU5.jpg') center/cover no-repeat;}
  .ep-hero::after{content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(11,61,46,0.05), rgba(11,61,46,0.35) 70%); pointer-events:none;}
  .ep-hero-inner{position:relative; z-index:2; width:100%; text-align:center; padding:60px 32px 120px;}
  .ep-eyebrow{display:inline-flex; align-items:center; gap:10px; color:#EAF6EF; font-weight:600; font-size:14px; letter-spacing:.08em; text-transform:uppercase; margin-bottom:22px;}
  .ep-eyebrow::before, .ep-eyebrow::after{content:''; width:28px; height:1px; background:var(--green-light);}
  .ep-h1{font-family:'Fraunces', serif; font-weight:600; font-size:clamp(40px, 6.2vw, 76px); line-height:1.08; color:#fff; letter-spacing:-0.02em; max-width:900px; margin:0 auto;}
  .ep-h1 em{font-style:italic; font-weight:500; background:linear-gradient(90deg, var(--green-light), #C8F0DA); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .ep-hero-sub{color:rgba(255,255,255,0.82); font-size:17px; max-width:560px; margin:26px auto 40px; line-height:1.6;}
  .ep-hero-ctas{display:flex; gap:16px; justify-content:center; flex-wrap:wrap;}
  .ep-btn-lg{padding:15px 30px; font-size:15px;}
 
  .ep-pulse-wrap{position:absolute; left:0; right:0; bottom:0; z-index:2; line-height:0;}
  .ep-pulse-wrap svg{width:100%; height:120px; display:block;}
  .ep-pulse-line{fill:none; stroke:var(--green-light); stroke-width:2.5; stroke-dasharray:1400; stroke-dashoffset:1400; animation:ep-draw 3.2s ease-out forwards .4s;}
  @keyframes ep-draw{to{stroke-dashoffset:0;}}
 
  /* STATS */
  .ep-stats{background:var(--forest-dark); padding:34px 0;}
  .ep-stats .ep-container{display:flex; justify-content:space-between; flex-wrap:wrap; gap:24px;}
  .ep-stat{color:#fff; text-align:left;}
  .ep-stat b{font-family:'Fraunces', serif; font-size:30px; font-weight:600; color:var(--green-light); display:block;}
  .ep-stat span{font-size:13px; color:rgba(255,255,255,0.65); letter-spacing:.03em;}
 
  /* SECTIONS */
  .ep-section{padding:110px 0;}
  .ep-section-head{max-width:640px; margin:0 auto 60px; text-align:center;}
  .ep-tag{display:inline-block; color:var(--green); font-weight:700; font-size:13px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:14px;}
  .ep-h2{font-family:'Fraunces', serif; font-weight:600; font-size:clamp(30px, 4vw, 44px); color:var(--forest-dark); letter-spacing:-0.01em;}
  .ep-section-head p{color:var(--slate); margin-top:16px; font-size:16px; line-height:1.6;}
 
  .ep-cards{display:grid; grid-template-columns:repeat(3, 1fr); gap:28px;}
  .ep-card{background:#fff; border-radius:20px; padding:36px 30px; border:1px solid var(--line); transition:transform .25s ease, box-shadow .25s ease;}
  .ep-card:hover{transform:translateY(-6px); box-shadow:var(--shadow);}
  .ep-card-icon{width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg, var(--green), var(--forest)); margin-bottom:22px;}
  .ep-card h3{font-family:'Fraunces', serif; font-weight:600; font-size:20px; margin-bottom:10px; color:var(--forest-dark);}
  .ep-card p{color:var(--slate); font-size:14.5px; line-height:1.65;}
 
  .ep-split{display:grid; grid-template-columns:1fr 1fr; gap:70px; align-items:center;}
  .ep-split img{border-radius:22px; box-shadow:var(--shadow);}
  .ep-split p{color:var(--slate); line-height:1.75; margin:18px 0 26px; font-size:15.5px;}
  .ep-checklist{display:flex; flex-direction:column; gap:14px; margin-bottom:30px;}
  .ep-checklist li{display:flex; align-items:center; gap:12px; font-size:14.5px; color:var(--ink); font-weight:500;}
  .ep-check-dot{width:22px; height:22px; border-radius:50%; background:var(--green); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; font-size:12px; font-weight:700;}
 
  .ep-cta-band{background:linear-gradient(120deg, var(--forest-dark), var(--forest)); border-radius:28px; padding:70px 50px; text-align:center; position:relative; overflow:hidden;}
  .ep-cta-band .ep-h2{color:#fff;}
  .ep-cta-band p{color:rgba(255,255,255,0.75); max-width:520px; margin:16px auto 34px;}
  .ep-cta-band-actions{display:flex; gap:16px; justify-content:center; flex-wrap:wrap;}
 
  .ep-footer{background:var(--forest-dark); color:rgba(255,255,255,0.7); padding:70px 0 30px; margin-top:110px;}
  .ep-footer-grid{display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:40px; padding-bottom:50px; border-bottom:1px solid rgba(255,255,255,0.1);}
  .ep-footer-grid .ep-logo{color:#fff;}
  .ep-footer-grid p{font-size:14px; line-height:1.7; margin-top:14px; max-width:280px; color:rgba(255,255,255,0.55);}
  .ep-footer-grid h4{color:#fff; font-size:14px; margin-bottom:18px; letter-spacing:.03em;}
  .ep-footer-grid ul li{margin-bottom:11px;}
  .ep-footer-grid ul li a{font-size:14px; color:rgba(255,255,255,0.6); transition:color .2s;}
  .ep-footer-grid ul li a:hover{color:var(--green-light);}
  .ep-footer-bottom{display:flex; justify-content:space-between; padding-top:26px; font-size:13px; flex-wrap:wrap; gap:10px;}
 
  @media (max-width:900px){
    .ep-nav-links{display:none;}
    .ep-burger{display:flex;}
    .ep-cards{grid-template-columns:1fr;}
    .ep-split{grid-template-columns:1fr; gap:36px;}
    .ep-footer-grid{grid-template-columns:1fr 1fr; gap:34px;}
  }
  @media (max-width:520px){
    .ep-footer-grid{grid-template-columns:1fr;}
    .ep-cta-band{padding:50px 26px;}
    .ep-nav-actions .ep-btn-ghost{display:none;}
  }
  @media (prefers-reduced-motion: reduce){
    .ep-root *{animation:none !important; transition:none !important;}
  }
`;
 
function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12h4l2 6 4-14 3 10 2-2h5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
 
export default function EcoPulse() {
  const [menuOpen, setMenuOpen] = useState(false);
 
  return (
    <div className="ep-root">
      <style>{styles}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
      />
 
      <header className="ep-header">
        <div className="ep-container">
          <nav className="ep-nav">
           <a href="#top" className="ep-logo">
              <img src={LOGO} alt="Eco Pulse Logo" className="ep-logo-img" />
        </a>
 
           
 
            <div className="ep-nav-actions">
              <a href="/login" className="ep-btn ep-btn-ghost">Log in</a>
              <a href="/register" className="ep-btn ep-btn-primary">Register</a>
              <button
                className="ep-burger"
                aria-label="Menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span></span><span></span><span></span>
              </button>
            </div>
          </nav>
 
          <div className={`ep-mobile-menu${menuOpen ? " open" : ""}`}>
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
            <a href="#solutions" onClick={() => setMenuOpen(false)}>Solutions</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          </div>
        </div>
      </header>
 
      <section className="ep-hero" id="top">
        <div className="ep-hero-inner">
          <span className="ep-eyebrow">Junk removal made easy</span>
          <h1 className="ep-h1">
            Your <em>environmental</em>
            <br />
            specialists
          </h1>
          <p className="ep-hero-sub">
            Eco Pulse clears the clutter and keeps it out of landfills — fast
            pickups, honest pricing, and a plan for every item to go
            somewhere better.
          </p>
          <div className="ep-hero-ctas">
            <a href="#about" className="ep-btn ep-btn-primary ep-btn-lg">About us</a>
          </div>
        </div>
 
        <div className="ep-pulse-wrap">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              className="ep-pulse-line"
              d="M0,80 L220,80 L260,20 L300,110 L340,80 L1200,80"
            ></path>
          </svg>
        </div>
      </section>
 
      <div className="ep-stats">
        <div className="ep-container">
          <div className="ep-stat"><b>12,400+</b><span>Pickups completed</span></div>
          <div className="ep-stat"><b>96%</b><span>Diverted from landfill</span></div>
          <div className="ep-stat"><b>48</b><span>Cities served</span></div>
          <div className="ep-stat"><b>4.9/5</b><span>Average customer rating</span></div>
        </div>
      </div>
 
      <section className="ep-section" id="services">
        <div className="ep-container">
          <div className="ep-section-head">
            <span className="ep-tag">What we do</span>
            <h2 className="ep-h2">Services built around your space</h2>
            <p>From a single sofa to a full estate clean-out, Eco Pulse handles the heavy lifting and the responsible disposal.</p>
          </div>
          <div className="ep-cards">
            <div className="ep-card">
              <div className="ep-card-icon"></div>
              <h3>Residential removal</h3>
              <p>Same-week pickups for furniture, appliances, and everyday clutter, sorted for reuse before anything is discarded.</p>
            </div>
            <div className="ep-card">
              <div className="ep-card-icon"></div>
              <h3>Commercial clean-outs</h3>
              <p>Office relocations, renovations, and estate clearances handled on your schedule, with a certificate of disposal.</p>
            </div>
            <div className="ep-card">
              <div className="ep-card-icon"></div>
              <h3>Recycling &amp; donation</h3>
              <p>Usable items are routed to local donation centers; the rest is sorted at our facility to maximize recycling.</p>
            </div>
          </div>
        </div>
      </section>
 
      <section className="ep-section" id="about">
        <div className="ep-container">
          <div className="ep-split">
            <img
              src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1200&auto=format&fit=crop"
              alt="Green park with city skyline"
            />
            <div>
              <span className="ep-tag">Why Eco Pulse</span>
              <h2 className="ep-h2">A cleanup crew that actually cares where things end up</h2>
              <p>We built Eco Pulse because most junk removal ends at a landfill. Every pickup is sorted on-site, so donatable items find a second home and recyclables never mix with waste.</p>
              <ul className="ep-checklist">
                <li><span className="ep-check-dot">✓</span> Transparent, upfront pricing</li>
                <li><span className="ep-check-dot">✓</span> Licensed and insured crews</li>
                <li><span className="ep-check-dot">✓</span> Landfill-diversion tracking on every job</li>
              </ul>
              <a href="#contact" className="ep-btn ep-btn-primary">Get a free quote</a>
            </div>
          </div>
        </div>
      </section>
 
      <section className="ep-section" id="contact">
        <div className="ep-container">
          <div className="ep-cta-band">
            <h2 className="ep-h2">Ready to clear the space?</h2>
            <p>Create a free account to schedule pickups, track your diversion impact, and manage every job in one place.</p>
            <div className="ep-cta-band-actions">
              <a href="#register" className="ep-btn ep-btn-primary ep-btn-lg">Register</a>
              <a href="#login" className="ep-btn ep-btn-outline-light ep-btn-lg">Log in</a>
            </div>
          </div>
        </div>
      </section>
 
      <footer className="ep-footer">
        <div className="ep-container">
          <div className="ep-footer-grid">
            <div>
              <a href="#top" className="ep-logo">
                <span className="ep-logo-mark"></span>Eco<span>Pulse</span>
              </a>
              <p>Environmental removal and recycling services, built to keep more out of the landfill and back into use.</p>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About us</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4>Account</h4>
              <ul>
                <li><a href="#login">Log in</a></li>
                <li><a href="#register">Register</a></li>
                <li><a href="#">Order a pickup</a></li>
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:hello@ecopulse.com">hello@ecopulse.com</a></li>
                <li><a href="tel:+12345678901">+1 (234) 567-89-01</a></li>
              </ul>
            </div>
          </div>
          <div className="ep-footer-bottom">
            <span>© 2026 Eco Pulse. All rights reserved.</span>
            <span>Privacy · Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}