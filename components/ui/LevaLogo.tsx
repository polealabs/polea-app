export function LevaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#0D0D0D"/>
      <g transform="translate(2,2) scale(0.28) rotate(26, 50, 50)">
        <path fill="#E8DFC4" fillRule="evenodd" d="M50 9 C 65 9, 80 30, 80 54 C 80 76, 67 93, 50 93 C 33 93, 20 76, 20 54 C 20 30, 35 9, 50 9 Z M50 60 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 Z"/>
      </g>
    </svg>
  )
}
