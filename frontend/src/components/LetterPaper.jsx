import { useTypewriter } from '../hooks/useTypewriter.js';

/**
 * A sheet of paper with a handwritten letter. With `typewriter`, the text is written out progressively
 * (a screen-reader-only copy holds the full text so nothing is lost for assistive technology).
 */
export default function LetterPaper({ title, body, signature, typewriter = false, active = true, className = '' }) {
  const { shown, done, skip } = useTypewriter(body || '', typewriter && active);
  const text = typewriter ? shown : body;
  const finished = !typewriter || done;

  return (
    <article className={`paper relative rounded-sm px-6 py-10 md:px-14 md:py-14 ${className}`}>
      {title && <h3 className="mb-6 font-script text-4xl text-burgundy md:text-5xl">{title}</h3>}

      <p className="sr-only">{body}</p>
      <div aria-hidden="true" className="whitespace-pre-line font-hand text-[1.55rem] leading-[1.55] text-burgundy-dark/90 md:text-[1.8rem]">
        {text}
        {!finished && <span className="ml-0.5 inline-block h-6 w-[2px] translate-y-1 animate-pulse bg-burgundy" />}
      </div>

      {typewriter && !done && (
        <button onClick={skip} className="mt-6 text-xs uppercase tracking-[0.25em] text-burgundy/60 underline-offset-4 hover:underline">
          Show the whole letter
        </button>
      )}
      {finished && signature && <p className="mt-8 text-right font-script text-3xl text-burgundy">{signature}</p>}
    </article>
  );
}
