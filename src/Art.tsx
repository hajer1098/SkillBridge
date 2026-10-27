export function Bridge() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M8 29V14m24 15V14M8 19c6-14 18-14 24 0M15 29V11m10 18V11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 350 230"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="190" cy="112" r="99" fill="#EBC6D0" opacity=".6" />
      <path d="M69 191h236" stroke="#C591A3" strokeWidth="1.5" />
      <path
        d="M242 186c4-31-1-59-10-88m9 48c14-19 31-24 37-22-1 15-16 25-35 25m-6-20c-20-6-27-20-25-29 16 2 24 12 26 25"
        stroke="#526044"
        strokeWidth="3"
      />
      <path d="M223 158h37l-6 32h-25z" fill="#883955" />
      <path d="M99 147l81-12 57 36-87 17-51-24z" fill="#526044" />
      <path d="M99 141l81-12 57 36-87 17-51-24z" fill="#fff" />
      <path d="M99 135l81-12 57 36-87 17-51-24z" fill="#758060" />
      <path d="M109 129l80-18 49 28-80 22-49-18z" fill="#B76E86" />
      <path d="M109 122l80-18 49 28-80 22-49-18z" fill="#FCFAF6" />
      <path d="M109 117l80-18 49 28-80 22-49-18z" fill="#883955" />
      <path
        d="M129 100c6-22-3-37-5-40 31-5 49 18 49 18 4-25 24-36 46-32-5 16-8 31-2 51l-44 17z"
        fill="#FCFAF6"
        stroke="#D4B0B9"
      />
      <path
        d="M173 78v36m-37-42c13 0 21 8 25 15m-21-4c11 1 17 7 20 12m45-36c-14 3-20 11-23 19m19-8c-11 3-15 8-18 15"
        stroke="#BE8D9D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M86 70l5-15 5 15 15 5-15 5-5 15-5-15-15-5z" fill="#883955" />
      <path d="M269 55l3-9 3 9 9 3-9 3-3 9-3-9-9-3z" fill="#526044" />
      <circle cx="118" cy="37" r="4" fill="#C28B9D" />
      <circle cx="288" cy="100" r="4" fill="#C28B9D" />
      <path
        d="M61 136c-15-17-12-33 1-33 13 0 13 19 4 19-7 0-9-7-7-12"
        stroke="#B38394"
        strokeWidth="2"
      />
      <path d="M67 143l-1-13m-4 8 8-3" stroke="#B38394" strokeWidth="2" />
    </svg>
  );
}
export function CourseArt({ type }: { type: string }) {
  return (
    <div className={"course-art art-" + type} aria-hidden="true">
      {type === "design" ? (
        <>
          <div className="art-grid" />
          <div className="design-window">
            <div className="window-dots">•••</div>
            <div className="wire-row">
              <div className="wire-pic" />
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="wire-bottom">
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="floating-cursor">↖</span>
          <span className="art-pill">Made for people.</span>
        </>
      ) : type === "code" ? (
        <>
          <span className="code-deco">{"{ }"}</span>
          <div className="code-window">
            <div className="window-dots">
              ••• <span>my-next-chapter.jsx</span>
            </div>
            <pre>
              <b>const</b> YourFuture = () =&gt; {"{"}
              <br /> <em>return</em> (<br /> &lt;<strong>SomethingGreat</strong>{" "}
              /&gt;
              <br /> );
              <br />
              {"}"};
            </pre>
          </div>
          <span className="code-spark">✳</span>
        </>
      ) : (
        <>
          <div className="art-grid" />
          <div className="chart-window">
            <div className="chart-title">A little progress, every day.</div>
            <div className="bars">
              {[32, 52, 43, 72, 64, 93].map((h, i) => (
                <i key={i} style={{ height: h + "%" }} />
              ))}
            </div>
            <div className="chart-axis">M　 T　 W　 T　 F　 S</div>
          </div>
          <span className="chart-circle">↗</span>
        </>
      )}
    </div>
  );
}
