import { motion } from 'framer-motion';

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', tone = 'dark' }) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <motion.header
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-12 max-w-2xl md:mb-16 ${alignClass}`}
    >
      {eyebrow && <p className={`eyebrow mb-4 ${tone === 'light' ? '!text-burgundy' : ''}`}>{eyebrow}</p>}
      <h2
        className={`text-4xl leading-tight md:text-6xl ${tone === 'light' ? 'text-burgundy-dark' : 'text-ivory'}`}
      >
        {title}
      </h2>
      <div className={`mt-6 h-px w-20 bg-gradient-to-r from-transparent via-gold to-transparent ${align === 'center' ? 'mx-auto' : ''}`} />
      {subtitle && (
        <p className={`mt-6 text-lg leading-relaxed md:text-xl ${tone === 'light' ? 'text-burgundy/80' : 'text-ivory/70'} font-serif italic`}>
          {subtitle}
        </p>
      )}
    </motion.header>
  );
}
