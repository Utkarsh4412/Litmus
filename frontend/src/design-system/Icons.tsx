type Props = { className?: string };

export const ScaleIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M12 3v18M7 21h10M4 7h16M6 7l-4 8h8L6 7Zm12 0-4 8h8l-4-8Z" strokeLinejoin="round" />
  </svg>
);

export const ChatIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1.6 3.2A7.96 7.96 0 0 1 21 12z" strokeLinejoin="round"/>
  </svg>
);

export const CompareIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="3" y="4" width="7" height="16" rx="2"/>
    <rect x="14" y="4" width="7" height="16" rx="2"/>
  </svg>
);

export const BeakerIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9 3h6v4l5 11a2 2 0 0 1-1.8 2.9H5.8A2 2 0 0 1 4 18l5-11V3z" strokeLinejoin="round"/>
    <path d="M7 14h10"/>
  </svg>
);

export const UploadIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 16V4M6 10l6-6 6 6" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M4 20h16" strokeLinecap="round"/>
  </svg>
);

export const SendIcon = ({ className = "w-4 h-4" }: Props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M4 12l16-8-6 18-3-7-7-3z" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
