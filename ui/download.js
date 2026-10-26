// @ts-check
/** Lädt einen Blob über einen temporären Object-URL-Link herunter und widerruft die URL danach. */
export const REVOKE_DELAY_MS = 1000;

/**
 * @param {Blob} blob @param {string} filename
 * @param {{ doc?:Document, url?:{ createObjectURL:(b:Blob)=>string, revokeObjectURL:(u:string)=>void }, setTimer?:(fn:()=>void, ms:number)=>unknown }} [deps]
 */
export function downloadBlob(blob, filename, { doc = document, url = URL, setTimer = (fn, ms) => setTimeout(fn, ms) } = {}) {
  const href = url.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = href;
  a.download = filename;
  a.hidden = true;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimer(() => url.revokeObjectURL(href), REVOKE_DELAY_MS);
}
