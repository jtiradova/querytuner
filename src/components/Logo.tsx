type LogoProps = {
  className?: string;
};

/**
 * SingleStore wordmark + submark from the asset in /public/singlestore-logo.svg.
 * Renders at 24px tall to match the Fusion top-nav lockup spec.
 */
export function Logo({ className = '' }: LogoProps) {
  return (
    <img
      src="/singlestore-logo.svg"
      alt="SingleStore"
      className={`h-6 w-auto ${className}`}
      draggable={false}
    />
  );
}
