import { useEffect, useState } from 'preact/hooks';

/** <img> for a Blob, with the object URL created once and revoked on unmount. */
export function PhotoImg({ blob, class: cls, onClick }: { blob: Blob; class?: string; onClick?: (e: MouseEvent) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img class={cls} src={url} alt="" onClick={onClick} /> : null;
}
