import { useEffect, useState } from "react";
import { getStorage } from "../shared/storage";

export function Pause() {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("domain") ?? "this site";
  const returnUrl = params.get("return") ?? `https://${domain}/`;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { pauseSettings } = await getStorage();
      setSecondsLeft(pauseSettings.durationSeconds);
    })();
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      window.location.href = returnUrl;
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, returnUrl]);

  if (secondsLeft === null) return null;

  return (
    <div className="card">
      <div className="count">{secondsLeft}</div>
      <h1>What are you here to do?</h1>
      <p>{domain} will open in a moment.</p>
      <p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (window.history.length > 1) window.history.back();
            else window.close();
          }}
        >
          Never mind
        </a>
      </p>
    </div>
  );
}
